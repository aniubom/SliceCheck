// SliceCheck verifier.
// Checks an AI review against the rules. Returns a list of problems; an empty
// list means the review passed. Run it after every AI review.

import { activeRules } from "./check.js";

const normalizeSection = (text) =>
  String(text || "").toLowerCase().replace(/[*`]/g, "").replace(/[_-]+/g, " ")
    .replace(/:\s*$/, "").replace(/\s+/g, " ").trim();

// Resolve known labels without requiring AI findings to use canonical wording.
// Try the whole alias first: "roles and permissions" may be one section.
function sectionResolver(rules) {
  const aliases = new Map([["whole ticket", "any"]]);
  for (const [name, section] of Object.entries(rules.sections || {})) {
    for (const label of [name, ...(section.aliases || [])]) {
      aliases.set(normalizeSection(label), name);
    }
  }
  return function resolve(label) {
    const normalized = normalizeSection(label);
    if (aliases.has(normalized)) return [aliases.get(normalized)];
    // Split lists before compounds so an alias containing "and" remains intact.
    for (const separator of [/[,;]/, /[/&]|\band\b/]) {
      const parts = normalized.split(separator);
      if (parts.length > 1) return [...new Set(parts.flatMap(resolve))];
    }
    // Unknown AI labels are allowed, but identical labels still contradict.
    return normalized ? [normalized] : [];
  };
}

export function parseReview(text) {
  const lines = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const at = (h) => lines.findIndex((l) => l.replace(/[#*:\s]/g, "").toUpperCase() === h);
  const f = at("FINDINGS");
  const g = at("GOOD");
  const v = at("VERDICT");
  const findings =
    f >= 0
      ? lines
          .slice(f + 1, g >= 0 ? g : v >= 0 ? v : undefined)
          .filter((l) => l !== "(none)")
          .map((l) => {
            const parts = l.split("|").map((p) => p.trim());
            return { raw: l, label: parts[0], id: parts[1], section: parts[2], note: parts.slice(3).join(" | ") };
          })
      : [];
  const verdictLines = v >= 0 ? lines.slice(v + 1) : [];
  const goodLine = g >= 0 && g + 1 < (v >= 0 ? v : lines.length) ? lines[g + 1] : "";
  return { lines, hasSections: { findings: f >= 0, good: g >= 0, verdict: v >= 0 }, findings, verdictLines, goodLine };
}

export function verifyReview(reviewText, checkResult, rules) {
  const problems = [];
  const L = rules.output.labels;
  const V = rules.output.verdict;
  const review = parseReview(reviewText);

  // 1. Format
  for (const [name, ok] of Object.entries(review.hasSections)) {
    if (!ok) problems.push(`Format: missing the ${name.toUpperCase()} heading.`);
  }
  if (review.verdictLines.length !== 1) {
    problems.push(`Format: expected exactly one verdict line, found ${review.verdictLines.length}.`);
  }

  // 2. Every finding cites a real, active rule with the right label
  const { all } = activeRules(rules);
  const byId = new Map(all.map((r) => [r.id, r]));
  const codeById = new Map(checkResult.findings.map((f) => [f.id, f]));
  // Some code rules have a condition that only the AI can decide.
  const deferred = new Set(checkResult.aiRules.map((r) => r.id));
  for (const f of review.findings) {
    const rule = byId.get(f.id);
    if (!rule) {
      problems.push(`Finding cites no real rule ID: "${f.raw}"`);
      continue;
    }
    if (rule.bucket === "ignore") problems.push(`Flagged an ignored item (${f.id}): "${f.raw}"`);
    else if (rule.bucket === "off") problems.push(`Cited a rule that is turned off (${f.id}).`);
    else if (f.label !== L[rule.bucket]) {
      problems.push(`${f.id} is ${L[rule.bucket]}, but the review labeled it "${f.label}".`);
    }
    if (rule.by === "code" && ["must_fix", "heads_up"].includes(rule.bucket)) {
      const actual = codeById.get(f.id);
      if (!actual && !deferred.has(f.id)) {
        problems.push(`Invented code finding: ${f.id} was not produced by the checker.`);
      } else if (actual && f.section !== actual.section) {
        problems.push(`${f.id} section must be "${actual.section}", not "${f.section}".`);
      }
    }
  }

  // 3. No code finding was dropped
  const cited = new Set(review.findings.map((f) => f.id));
  for (const c of checkResult.findings) {
    if (!cited.has(c.id)) problems.push(`Dropped a code finding: ${c.id} (${c.section}).`);
  }

  // Check recognized section names and aliases, including "User story and AC".
  // A whole-ticket finding does not imply every individual section is bad.
  const resolveSection = sectionResolver(rules);
  const flaggedSections = new Set(review.findings.flatMap((f) => resolveSection(f.section)));
  const good = review.goodLine.split("|").slice(1).join("|");
  for (const section of resolveSection(good)) {
    if (flaggedSections.has(section)) {
      problems.push(`Good list contradicts findings: ${section.replace(/_/g, " ")} has a finding.`);
    }
  }

  // 4. Verdict matches the findings
  const mustFix = review.findings.filter((f) => byId.get(f.id)?.bucket === "must_fix");
  const verdict = review.verdictLines[0] || "";
  if (mustFix.length > 0) {
    const prefix = V.blocked + ":";
    if (!verdict.startsWith(prefix)) {
      problems.push(`Verdict contradicts findings: there are Must Fix items, so it must start with "${prefix}".`);
    } else {
      const expectedIds = new Set(mustFix.map((f) => f.id));
      const ids = verdict.slice(prefix.length).split(",").map((id) => id.trim());
      const actualIds = new Set(ids);
      for (const id of expectedIds) {
        if (!actualIds.has(id)) problems.push(`Verdict doesn't list Must Fix item ${id}.`);
      }
      for (const id of actualIds) {
        if (!expectedIds.has(id)) problems.push(`Verdict lists an unexpected Must Fix ID: "${id}".`);
      }
    }
  } else if (verdict !== V.clear) {
    problems.push(`Verdict contradicts findings: no Must Fix items, so it must be exactly "${V.clear}".`);
  }

  return { passed: problems.length === 0, problems };
}
