// SliceCheck verifier.
// Checks an AI review against the rules. Returns a list of problems; an empty
// list means the review passed. Run it after every AI review.

import { activeRules } from "./check.js";

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
  return { lines, hasSections: { findings: f >= 0, good: g >= 0, verdict: v >= 0 }, findings, verdictLines };
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
  }

  // 3. No code finding was dropped
  const cited = new Set(review.findings.map((f) => f.id));
  for (const c of checkResult.findings) {
    if (!cited.has(c.id)) problems.push(`Dropped a code finding: ${c.id} (${c.section}).`);
  }

  // 4. Verdict matches the findings
  const mustFix = review.findings.filter((f) => byId.get(f.id)?.bucket === "must_fix");
  const verdict = review.verdictLines[0] || "";
  if (mustFix.length > 0) {
    if (!verdict.startsWith(V.blocked)) {
      problems.push(`Verdict contradicts findings: there are Must Fix items, so it must start with "${V.blocked}".`);
    } else {
      for (const f of mustFix) {
        if (!verdict.includes(f.id)) problems.push(`Verdict doesn't list Must Fix item ${f.id}.`);
      }
    }
  } else if (verdict !== V.clear) {
    problems.push(`Verdict contradicts findings: no Must Fix items, so it must be exactly "${V.clear}".`);
  }

  return { passed: problems.length === 0, problems };
}
