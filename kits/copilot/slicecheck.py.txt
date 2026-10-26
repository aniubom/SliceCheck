#!/usr/bin/env python3
"""SliceCheck: ticket peer review, minus the noise.

Python version of the SliceCheck engine, for AI tools whose code sandbox runs
Python (ChatGPT Code Interpreter, Microsoft 365 Copilot code interpreter,
Claude.ai). Standard library only. Rules come from rules.json, generated from
rules.yaml in the SliceCheck repo.

Usage:
  python slicecheck.py check  <ticket-file>                 code findings
  python slicecheck.py prompt <ticket-file>                 review instructions
  python slicecheck.py verify <ticket-file> <review-file>   check a review
  Options: --rules <path>  --json      Use "-" to read from standard input.

In a notebook:
  import slicecheck as sc
  rules = sc.load_rules("rules.json")
  result = sc.check_ticket(ticket_text, rules)
  print(sc.build_prompt(ticket_text, result, rules))
  print(sc.verify_review(review_text, result, rules))
"""

import json
import os
import re
import sys

# ---------------------------------------------------------------- rules


def load_rules(path=None):
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [path] if path else ["slicecheck.rules.json", os.path.join(here, "rules.json")]
    for p in candidates:
        if p and os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("rules.json not found (pass --rules <path>)")


# ---------------------------------------------------------------- parsing

_LEAD = re.compile(r"^[\s>#*\-•]+")


def _clean(s):
    s = _LEAD.sub("", s)
    s = re.sub(r"[*_]+", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _lower(s):
    return _clean(s).lower()


def _alias_index(rules):
    index = []
    for name, d in (rules.get("sections") or {}).items():
        for alias in d.get("aliases") or []:
            index.append((name, alias.lower()))
    # Longest alias first so specific names beat short ones (stable, like JS).
    return sorted(index, key=lambda x: -len(x[1]))


def _match_header(line, index):
    l = _lower(line)
    if not l:
        return None
    for name, alias in index:
        if l == alias or l == alias + ":":
            return name, ""
        if l.startswith(alias + ":"):
            return name, _clean(line)[len(alias) + 1:].strip()
        if l.startswith(alias + " - ") or l.startswith(alias + " ("):
            return name, ""
    return None


def _compile(patterns):
    return [re.compile(p, re.I) for p in (patterns or [])]


def parse_ticket(text, rules):
    p = rules.get("parsing") or {}
    template_rx = _compile(p.get("template_lines"))
    index = _alias_index(rules)
    text = str(text or "")
    lines = re.sub(r"\r\n?", "\n", text).split("\n")
    fields = {n for n, d in (rules.get("sections") or {}).items() if d.get("field")}
    sections = {}
    current = None

    for i, raw in enumerate(lines):
        header = _match_header(raw, index)
        if header:
            current, rest = header
            if current not in sections:
                sections[current] = {"found": True, "line": i + 1, "lines": []}
            if rest:
                sections[current]["lines"].append(rest)
                if current in fields:
                    current = None
            continue
        if not current:
            continue
        c = _clean(raw)
        if not c or any(rx.search(c) for rx in template_rx):
            continue
        sections[current]["lines"].append(c)
        if current in fields:
            current = None

    for s in sections.values():
        s["content"] = "\n".join(s["lines"])
    return {"text": text, "lines": lines, "sections": sections, "stage": _detect_stage(lines, sections, rules)}


def _detect_stage(lines, sections, rules):
    stages = rules.get("stages") or {}

    def lookup(value):
        v = _lower(value)
        for stage, words in stages.items():
            for w in words:
                w = w.lower()
                if v == w or v.startswith(w + " ("):
                    return stage
        return None

    status = sections.get("status")
    if status:
        for l in status["lines"]:
            s = lookup(l)
            if s:
                return s
    for l in lines[:40]:
        s = lookup(l)
        if s:
            return s
    return "unknown"


def _body(content):
    return [l.strip().lower() for l in (content or "").split("\n") if l.strip()]


def is_empty_value(content, rules):
    empties = [v.lower() for v in (rules.get("parsing") or {}).get("empty_values", [""])]
    body = _body(content)
    return not body or all(l in empties for l in body)


def is_na_value(content, rules):
    nas = [v.lower() for v in (rules.get("parsing") or {}).get("na_values", [])]
    body = [re.sub(r"[.:]$", "", l) for l in _body(content)]
    return bool(body) and all(l in nas for l in body)


def has_placeholder(content, rules):
    return any(rx.search(content or "") for rx in _compile((rules.get("parsing") or {}).get("placeholder_patterns")))


# ---------------------------------------------------------------- checking

ACTIVE = ("must_fix", "heads_up")


def active_rules(rules):
    allr = list(rules.get("rules") or []) + list((rules.get("team_pack") or {}).get("rules") or [])
    return {
        "code": [r for r in allr if r.get("bucket") in ACTIVE and r.get("by") == "code"],
        "ai": [r for r in allr if r.get("bucket") in ACTIVE and r.get("by") == "ai"],
        "ignore": [r for r in allr if r.get("bucket") == "ignore"],
        "all": allr,
    }


def _condition(when, ticket, rules):
    if not when:
        return True
    if "stage" in when:
        return ticket["stage"] == when["stage"]
    if "stage_not" in when:
        return ticket["stage"] != when["stage_not"] and ticket["stage"] != "unknown"
    if "section_not_na" in when:
        s = ticket["sections"].get(when["section_not_na"])
        return bool(s) and not is_na_value(s["content"], rules) and not is_empty_value(s["content"], rules)
    if when.get("approval") == "complete":
        a = (ticket["sections"].get("approval") or {}).get("content", "").lower()
        return bool(re.search(r"\bapproved\b|\b(\d+)/\1\b|signed off", a)) and not re.search(r"pending|\b0/\d", a)
    return "ai"


def _sequential_problem(content):
    nums = sorted({int(m) for m in re.findall(r"\bAC[\s#-]*(\d+)", content or "", re.I)})
    if not nums:
        return None
    if nums[0] != 1:
        return f"numbering starts at AC-{nums[0]}"
    for a, b in zip(nums, nums[1:]):
        if b != a + 1:
            return f"jumps from AC-{a} to AC-{b}"
    return None


def _duplicate_problem(text):
    lines = [re.sub(r"\s+", " ", l.lower()).strip() for l in text.split("\n")]
    lines = [l for l in lines if len(l) > 2]
    seen = {}
    for i in range(0, len(lines) - 2):
        block = " | ".join(lines[i:i + 3])
        if len(block.split(" ")) < 12:
            continue
        if block in seen and i - seen[block] >= 3:
            return f'repeated block starting "{lines[i][:60]}"'
        seen.setdefault(block, i)
    return None


def _run_check(rule, ticket, rules):
    if rule.get("section") == "any":
        return _duplicate_problem(ticket["text"]) if rule.get("check") == "no_duplicates" else None
    s = ticket["sections"].get(rule.get("section"))
    check = rule.get("check")
    if not s:
        return "section not found" if check in ("present", "not_empty") else None
    c = s["content"]
    if check == "present":
        return None
    if check == "not_empty":
        return "empty" if is_empty_value(c, rules) else None
    if check == "not_placeholder":
        if is_empty_value(c, rules):
            return "empty"
        return "still a placeholder" if has_placeholder(c, rules) else None
    if check == "not_na":
        if is_empty_value(c, rules):
            return "empty"
        return "marked N/A" if is_na_value(c, rules) else None
    if check == "sequential":
        return _sequential_problem(c)
    if check == "no_duplicates":
        return _duplicate_problem(c)
    return None


def _label(name):
    name = name.replace("_", " ")
    return name[:1].upper() + name[1:]


def _sections_of(rule):
    s = rule.get("section")
    return s if isinstance(s, list) else [s]


def check_ticket(ticket_text, rules):
    ticket = parse_ticket(ticket_text, rules)
    groups = active_rules(rules)
    findings, deferred = [], []
    for rule in groups["code"]:
        cond = _condition(rule.get("when"), ticket, rules)
        if cond is False:
            continue
        if cond == "ai":
            r = dict(rule, by="ai")
            r["note"] = f"Code checks this only if: {json.dumps(rule.get('when'), separators=(',', ':'))}. Decide whether that condition applies."
            deferred.append(r)
            continue
        problem = _run_check(rule, ticket, rules)
        if problem:
            findings.append({
                "id": rule["id"], "bucket": rule["bucket"],
                "section": "Whole ticket" if rule.get("section") == "any" else _label(rule["section"]),
                "message": rule["message"], "detail": problem, "by": "code",
            })
    wanted = []
    for r in groups["code"] + groups["ai"]:
        for n in _sections_of(r):
            if n not in wanted:
                wanted.append(n)
    not_found = [n for n in wanted if n != "any" and n not in ticket["sections"]]
    return {"stage": ticket["stage"], "findings": findings, "aiRules": groups["ai"] + deferred,
            "ignoreRules": groups["ignore"], "notFound": not_found}


# ---------------------------------------------------------------- prompt


def finding_text(f):
    """A code finding as one line. The detail is left off when the message already says it."""
    d = (f.get("detail") or "").strip()
    m = f["message"]
    if not d or d.lower() in m.lower():
        return m
    return f"{m[:-1]} ({d})." if m.endswith(".") else f"{m} ({d})"


def build_prompt(ticket_text, result, rules):
    L = rules["output"]["labels"]
    V = rules["output"]["verdict"]
    code = "\n".join(f"{L[f['bucket']]} | {f['id']} | {f['section']} | {finding_text(f)}"
                     for f in result["findings"]) or "(none)"
    # Judgment rules only for sections this ticket has. Missing optional sections
    # are never mentioned (missing required ones are already code findings).
    missing = set(result["notFound"])
    ai_rules = [r for r in result["aiRules"] if any(n == "any" or n not in missing for n in _sections_of(r))]
    ai = "\n".join(
        f"- {r['id']} [{L['must_fix'] if r['bucket'] == 'must_fix' else L['heads_up']}] "
        f"({', '.join(n.replace('_', ' ') for n in _sections_of(r))}): {r['message']}"
        + (f" Note: {r['note']}" if r.get("note") else "")
        for r in ai_rules) or "(none)"
    ignore = "\n".join(f"- {r['id']}: {r['message']}" for r in result["ignoreRules"]) or "(none)"
    return f'''You are SliceCheck, a ticket peer reviewer. Review the ticket below using ONLY these rules. Do not add findings that no rule covers.

TICKET STAGE: {result["stage"]}

STEP 1. CODE FINDINGS (already checked by script; copy every line exactly as written, do not drop or change any):
{code}

STEP 2. JUDGMENT RULES (check each one against the ticket; report a finding only if the rule is clearly broken):
{ai}

STEP 3. NEVER FLAG THESE (they are expected; mentioning them is an error):
{ignore}

OUTPUT FORMAT (use exactly this, nothing before or after):
FINDINGS
<one line per finding: label | rule ID | section | specific note>
GOOD
{L["good"]} | <comma-separated sections with no findings>
VERDICT
<exactly one line>

RULES FOR THE OUTPUT:
- Labels are exactly "{L["must_fix"]}" and "{L["heads_up"]}". Every finding cites one rule ID from the lists above.
- If there are no findings, write "(none)" under FINDINGS.
- VERDICT LOGIC (follow exactly): if there is at least one {L["must_fix"]} finding, the verdict line is "{V["blocked"]}: " followed by the Must Fix rule IDs. Otherwise the verdict line is "{V["clear"]}".
- One verdict line only. No extra commentary.

TICKET:
"""
{ticket_text.strip()}
"""'''


# ---------------------------------------------------------------- verify


def _parse_review(text):
    lines = [l.strip() for l in re.sub(r"\r\n?", "\n", str(text or "")).split("\n") if l.strip()]

    def at(h):
        for i, l in enumerate(lines):
            if re.sub(r"[#*:\s]", "", l).upper() == h:
                return i
        return -1

    f, g, v = at("FINDINGS"), at("GOOD"), at("VERDICT")
    findings = []
    if f >= 0:
        end = g if g >= 0 else (v if v >= 0 else len(lines))
        for l in lines[f + 1:end]:
            if l == "(none)":
                continue
            parts = [p.strip() for p in l.split("|")]
            findings.append({"raw": l, "label": parts[0] if parts else "", "id": parts[1] if len(parts) > 1 else None,
                             "section": parts[2] if len(parts) > 2 else None, "note": " | ".join(parts[3:])})
    end_good = v if v >= 0 else len(lines)
    good_line = lines[g + 1] if g >= 0 and g + 1 < end_good else ""
    return {"has": {"findings": f >= 0, "good": g >= 0, "verdict": v >= 0},
            "findings": findings, "verdict_lines": lines[v + 1:] if v >= 0 else [], "good_line": good_line}


def _normalize_section(text):
    text = re.sub(r"[*`]", "", str(text or "").lower())
    text = re.sub(r"[_-]+", " ", text)
    text = re.sub(r":\s*$", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _section_resolver(rules):
    # Resolve a whole alias before splitting compound AI labels.
    aliases = {"whole ticket": "any"}
    for name, section in (rules.get("sections") or {}).items():
        for label in [name] + (section.get("aliases") or []):
            aliases[_normalize_section(label)] = name

    def resolve(label):
        normalized = _normalize_section(label)
        if normalized in aliases:
            return [aliases[normalized]]
        for separator in [r"[,;]", r"[/&]|\band\b"]:
            parts = re.split(separator, normalized)
            if len(parts) > 1:
                return list(dict.fromkeys(name for part in parts for name in resolve(part)))
        return [normalized] if normalized else []

    return resolve


def verify_review(review_text, result, rules):
    problems = []
    L = rules["output"]["labels"]
    V = rules["output"]["verdict"]
    review = _parse_review(review_text)
    for name, ok in review["has"].items():
        if not ok:
            problems.append(f"Format: missing the {name.upper()} heading.")
    if len(review["verdict_lines"]) != 1:
        problems.append(f"Format: expected exactly one verdict line, found {len(review['verdict_lines'])}.")

    by_id = {r["id"]: r for r in active_rules(rules)["all"]}
    code_by_id = {f["id"]: f for f in result["findings"]}
    deferred = {r["id"] for r in result["aiRules"]}
    for f in review["findings"]:
        rule = by_id.get(f["id"])
        if not rule:
            problems.append(f'Finding cites no real rule ID: "{f["raw"]}"')
            continue
        if rule["bucket"] == "ignore":
            problems.append(f'Flagged an ignored item ({f["id"]}): "{f["raw"]}"')
        elif rule["bucket"] == "off":
            problems.append(f"Cited a rule that is turned off ({f['id']}).")
        elif f["label"] != L[rule["bucket"]]:
            problems.append(f'{f["id"]} is {L[rule["bucket"]]}, but the review labeled it "{f["label"]}".')
        if rule.get("by") == "code" and rule["bucket"] in ACTIVE:
            actual = code_by_id.get(f["id"])
            if not actual and f["id"] not in deferred:
                problems.append(f"Invented code finding: {f['id']} was not produced by the checker.")
            elif actual and f["section"] != actual["section"]:
                problems.append(f'{f["id"]} section must be "{actual["section"]}", not "{f["section"]}".')

    cited = {f["id"] for f in review["findings"]}
    for c in result["findings"]:
        if c["id"] not in cited:
            problems.append(f"Dropped a code finding: {c['id']} ({c['section']}).")

    resolve_section = _section_resolver(rules)
    flagged_sections = {name for f in review["findings"] for name in resolve_section(f["section"])}
    good = "|".join(review["good_line"].split("|")[1:])
    for section in resolve_section(good):
        if section in flagged_sections:
            problems.append(f"Good list contradicts findings: {section.replace('_', ' ')} has a finding.")

    must_fix = [f for f in review["findings"] if (by_id.get(f["id"]) or {}).get("bucket") == "must_fix"]
    verdict = review["verdict_lines"][0] if review["verdict_lines"] else ""
    if must_fix:
        prefix = V["blocked"] + ":"
        if not verdict.startswith(prefix):
            problems.append(f'Verdict contradicts findings: there are Must Fix items, so it must start with "{prefix}".')
        else:
            expected_ids = list(dict.fromkeys(f["id"] for f in must_fix))
            actual_ids = list(dict.fromkeys(s.strip() for s in verdict[len(prefix):].split(",")))
            for rule_id in expected_ids:
                if rule_id not in actual_ids:
                    problems.append(f"Verdict doesn't list Must Fix item {rule_id}.")
            for rule_id in actual_ids:
                if rule_id not in expected_ids:
                    problems.append(f'Verdict lists an unexpected Must Fix ID: "{rule_id}".')
    elif verdict != V["clear"]:
        problems.append(f'Verdict contradicts findings: no Must Fix items, so it must be exactly "{V["clear"]}".')
    return {"passed": not problems, "problems": problems}


# ---------------------------------------------------------------- render


def render_review(review_text, rules, warning=None):
    """The clean result the user sees. Verification stays silent unless it failed."""
    L = rules["output"]["labels"]
    review = _parse_review(review_text)
    by_id = {r["id"]: r for r in active_rules(rules)["all"]}

    def bucket(f):
        return (by_id.get(f["id"]) or {}).get("bucket")

    def item(f):
        note = f["note"] or (by_id.get(f["id"]) or {}).get("message", "")
        return f"- **{f['id']} · {f['section']}:** {note}".rstrip()

    def head(label):
        parts = label.split(" ")
        return f"{parts[0]} **{' '.join(parts[1:])}"

    out = ["**SliceCheck review**", ""]
    mf = [f for f in review["findings"] if bucket(f) == "must_fix"]
    hu = [f for f in review["findings"] if bucket(f) == "heads_up"]
    if mf:
        out += [head(L["must_fix"]) + "**"] + [item(f) for f in mf] + [""]
    if hu:
        out += [head(L["heads_up"]) + "**"] + [item(f) for f in hu] + [""]
    good = "|".join(review["good_line"].split("|")[1:]).strip()
    if good:
        out += [head(L["good"]) + ":** " + good, ""]
    out.append("**Verdict:** " + (review["verdict_lines"][0] if review["verdict_lines"] else ""))
    if warning:
        out += ["", "⚠️ " + warning]
    return "\n".join(out)


# ---------------------------------------------------------------- CLI


def _read(path):
    if path == "-":
        return sys.stdin.read()
    with open(path, encoding="utf-8") as f:
        return f.read()


def main(argv):
    args = list(argv)
    as_json = "--json" in args
    if as_json:
        args.remove("--json")
    rules_path = None
    if "--rules" in args:
        i = args.index("--rules")
        rules_path = args[i + 1]
        del args[i:i + 2]
    if not args or args[0] not in ("check", "prompt", "verify") or len(args) < 2 or (args[0] == "verify" and len(args) < 3):
        print(__doc__)
        return 1
    rules = load_rules(rules_path)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ticket = _read(args[1])
    result = check_ticket(ticket, rules)
    L = rules["output"]["labels"]
    if args[0] == "check":
        if as_json:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"Stage: {result['stage']}")
            if result["notFound"]:
                print(f"Sections not found: {', '.join(result['notFound'])}")
            if not result["findings"]:
                print("No code findings.")
            for f in result["findings"]:
                print(f"{L[f['bucket']]} | {f['id']} | {f['section']} | {finding_text(f)}")
            print("Judgment rules for the AI: " + (", ".join(r["id"] for r in result["aiRules"]) or "none"))
        return 0
    if args[0] == "prompt":
        print(build_prompt(ticket, result, rules))
        return 0
    review_text = _read(args[2])
    res = verify_review(review_text, result, rules)
    if res["passed"]:
        res["rendered"] = render_review(review_text, rules)
    if as_json:
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif res["passed"]:
        print("PASS. Show the user exactly this, nothing before or after:\n\n" + res["rendered"])
    else:
        print("FAIL: the review breaks the rules:")
        for p in res["problems"]:
            print(f"- {p}")
    return 0 if res["passed"] else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
