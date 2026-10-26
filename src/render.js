// SliceCheck renderer.
// Turns a verified review (FINDINGS / GOOD / VERDICT) into the clean result
// the user sees. Verification stays silent: nothing about it is shown unless
// it failed.

import { parseReview } from "./verify.js";
import { activeRules } from "./check.js";

export function renderReview(reviewText, rules, { warning } = {}) {
  const L = rules.output.labels;
  const review = parseReview(reviewText);
  const byId = new Map(activeRules(rules).all.map((r) => [r.id, r]));
  const bucketOf = (f) => byId.get(f.id)?.bucket;
  const item = (f) => `- **${f.id} · ${f.section}:** ${f.note || byId.get(f.id)?.message || ""}`.trimEnd();

  const mf = review.findings.filter((f) => bucketOf(f) === "must_fix");
  const hu = review.findings.filter((f) => bucketOf(f) === "heads_up");
  const out = mf.length || hu.length ? ["**SliceCheck review**", ""] : [];
  if (mf.length) out.push(`${L.must_fix.split(" ")[0]} **${L.must_fix.split(" ").slice(1).join(" ")}**`, ...mf.map(item), "");
  if (hu.length) out.push(`${L.heads_up.split(" ")[0]} **${L.heads_up.split(" ").slice(1).join(" ")}**`, ...hu.map(item), "");

  out.push(`**Verdict:** ${review.verdictLines[0] || ""}`);
  if (warning) out.push("", `⚠️ ${warning}`);
  return out.join("\n");
}
