// SliceCheck checker.
// Runs every rule marked "by: code" against a parsed ticket. Same input, same
// result, every time. Rules marked "by: ai" are handed to the AI reviewer.

import { isEmptyValue, isNaValue, hasPlaceholder } from "./parse.js";

const ACTIVE = new Set(["must_fix", "heads_up"]);

// All rules in play: defaults plus any team-pack rules a team switched on.
export function activeRules(rules) {
  const all = [...(rules.rules || []), ...(rules.team_pack?.rules || [])];
  return {
    code: all.filter((r) => ACTIVE.has(r.bucket) && r.by === "code"),
    ai: all.filter((r) => ACTIVE.has(r.bucket) && r.by === "ai"),
    ignore: all.filter((r) => r.bucket === "ignore"),
    all,
  };
}

// Conditions. Returns true (rule applies), false (skip), or "ai" when only
// judgment can tell (the rule is then handed to the AI with a note).
function conditionHolds(when, ticket, rules) {
  if (!when) return true;
  if (when.stage) return ticket.stage === when.stage;
  if (when.stage_not) return ticket.stage !== when.stage_not && ticket.stage !== "unknown";
  if (when.section_not_na) {
    const s = ticket.sections[when.section_not_na];
    return !!s && !isNaValue(s.content, rules) && !isEmptyValue(s.content, rules);
  }
  if (when.approval === "complete") {
    const a = ticket.sections.approval?.content?.toLowerCase() || "";
    return /\bapproved\b|\b(\d+)\/\1\b|signed off/.test(a) && !/pending|\b0\/\d/.test(a);
  }
  return "ai";
}

function acNumbers(content) {
  return [...(content || "").matchAll(/\bAC[\s#-]*(\d+)/gi)].map((m) => Number(m[1]));
}

function sequentialProblem(content) {
  const nums = [...new Set(acNumbers(content))].sort((a, b) => a - b);
  if (nums.length === 0) return null;
  if (nums[0] !== 1) return `numbering starts at AC-${nums[0]}`;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) return `jumps from AC-${nums[i - 1]} to AC-${nums[i]}`;
  }
  return null;
}

// A run of 3+ consecutive lines (12+ words) that appears twice.
function duplicateProblem(text) {
  const lines = text
    .split("\n")
    .map((l) => l.toLowerCase().replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2);
  const seen = new Map();
  for (let i = 0; i + 3 <= lines.length; i++) {
    const block = lines.slice(i, i + 3).join(" | ");
    if (block.split(" ").length < 12) continue;
    if (seen.has(block) && i - seen.get(block) >= 3) {
      return `repeated block starting "${lines[i].slice(0, 60)}"`;
    }
    if (!seen.has(block)) seen.set(block, i);
  }
  return null;
}

function runCheck(rule, ticket, rules) {
  if (rule.section === "any") {
    if (rule.check === "no_duplicates") return duplicateProblem(ticket.text);
    return null;
  }
  const s = ticket.sections[rule.section];
  if (!s) {
    // A missing section fails "present" and "not_empty"; other checks need content.
    if (rule.check === "present" || rule.check === "not_empty") return "section not found";
    return null;
  }
  switch (rule.check) {
    case "present":
      return null;
    case "not_empty":
      return isEmptyValue(s.content, rules) ? "empty" : null;
    case "not_placeholder":
      if (isEmptyValue(s.content, rules)) return "empty";
      return hasPlaceholder(s.content, rules) ? "still a placeholder" : null;
    case "not_na":
      if (isEmptyValue(s.content, rules)) return "empty";
      return isNaValue(s.content, rules) ? "marked N/A" : null;
    case "sequential":
      return sequentialProblem(s.content);
    case "no_duplicates":
      return duplicateProblem(s.content);
    default:
      return null;
  }
}

// A code finding as one line of text. The detail is left off when the message
// already says it ("Estimate is empty." never gets "(empty)" tacked on).
export function findingText(f) {
  const d = (f.detail || "").trim();
  if (!d || f.message.toLowerCase().includes(d.toLowerCase())) return f.message;
  return f.message.endsWith(".") ? `${f.message.slice(0, -1)} (${d}).` : `${f.message} (${d})`;
}

const sectionLabel = (name) =>
  name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Returns code findings, AI rules to hand off, and sections not found.
export function checkTicket(ticket, rules) {
  const { code, ai, ignore } = activeRules(rules);
  const findings = [];
  const deferred = [];

  for (const rule of code) {
    const cond = conditionHolds(rule.when, ticket, rules);
    if (cond === false) continue;
    if (cond === "ai") {
      deferred.push({ ...rule, by: "ai", note: `Code checks this only if: ${JSON.stringify(rule.when)}. Decide whether that condition applies.` });
      continue;
    }
    const problem = runCheck(rule, ticket, rules);
    if (problem) {
      findings.push({
        id: rule.id,
        bucket: rule.bucket,
        section: rule.section === "any" ? "Whole ticket" : sectionLabel(rule.section),
        message: rule.message,
        detail: problem,
        by: "code",
      });
    }
  }

  const wanted = new Set(
    [...code, ...ai].flatMap((r) => (Array.isArray(r.section) ? r.section : [r.section]))
  );
  const notFound = [...wanted].filter((n) => n !== "any" && !ticket.sections[n]);

  return {
    stage: ticket.stage,
    findings,
    aiRules: [...ai, ...deferred],
    ignoreRules: ignore,
    notFound,
  };
}
