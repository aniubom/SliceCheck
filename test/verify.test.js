import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import yaml from "js-yaml";
import { parseTicket } from "../src/parse.js";
import { checkTicket } from "../src/check.js";
import { verifyReview } from "../src/verify.js";
import { findingText } from "../src/check.js";
import { runPython, withTempDir } from "./helpers/runtime.js";

const rules = yaml.load(fs.readFileSync("rules.yaml", "utf8"));
const ticket = (name) => fs.readFileSync("examples/" + name, "utf8");
const clean = ticket("01-clean-jira.md");
const missingProblem = ticket("03-missing-problem-plain.txt");
const inDev = ticket("02-wrike-in-dev.txt");
const judgment = ticket("07-untestable-ac-typos-jira.md");
const check = (text, r = rules) => checkTicket(parseTicket(text, r), r);
const review = (findings = [], good = "Assignee", ids = []) =>
  ["FINDINGS", findings.length ? findings.join("\n") : "(none)", "GOOD", "✅ Good | " + good, "VERDICT",
    ids.length ? rules.output.verdict.blocked + ": " + ids.join(", ") : rules.output.verdict.clear].join("\n");
const finding = (id, section, note = "Issue.") =>
  rules.output.labels[rules.rules.find((r) => r.id === id).bucket] + " | " + id + " | " + section + " | " + note;
const codeLines = (text) => check(text).findings.map((f) =>
  rules.output.labels[f.bucket] + " | " + f.id + " | " + f.section + " | " + findingText(f));
const mf05 = finding("MF-05", "Acceptance criteria");
const mf06 = finding("MF-06", "User story and AC");
const correctMissing = review(codeLines(missingProblem), "User story", ["MF-01"]);
const both = review([mf05, mf06], "Problem statement", ["MF-05", "MF-06"]);
const cases = [];
const add = (name, text, written, passed, customRules = rules) =>
  cases.push({ name, ticket: text, review: written, passed, rules: customRules });

add("clean review", clean, review([], "Problem statement, User story, AC"), true);
add("real code findings", inDev, review(codeLines(inDev), "Problem statement, User story"), true);
add("CRLF tickets and reviews", inDev.replace(/\r?\n/g, "\r\n"),
  review(codeLines(inDev), "Problem statement, User story").replace(/\n/g, "\r\n"), true);
add("invented Must Fix code finding", clean, review([finding("MF-01", "Problem statement")], "Assignee", ["MF-01"]), false);
add("invented Heads Up code finding", clean, review([finding("HU-01", "Estimate")]), false);
add("code finding whose stage condition is false", clean, review([finding("HU-02", "Assignee")], "Problem statement"), false);
add("real code finding with wrong section", missingProblem, correctMissing.replace("| Problem statement |", "| Dependencies |"), false);
add("missing code finding", missingProblem, review([], "User story"), false);
add("Good contradicts code finding", missingProblem, correctMissing.replace("✅ Good | User story", "✅ Good | Problem statement"), false);
add("Good uses a code section alias", inDev, review(codeLines(inDev), "Story points"), false);
add("Good contradicts an AI finding", judgment, review([mf05], "Acceptance criteria", ["MF-05"]), false);
add("Good uses AC alias", judgment, review([mf05], "AC", ["MF-05"]), false);
add("compound AI label contradicts Good", judgment, review([mf06], "User story", ["MF-06"]), false);
add("compound Good label contradicts AI finding", judgment, review([mf05], "Problem statement, User story and AC", ["MF-05"]), false);
add("normalized Good section", judgment, review([mf05], "**ACCEPTANCE_CRITERIA**", ["MF-05"]), false);
add("flexible AI section label remains allowed", judgment, review([finding("MF-06", "Story spelling")], "Assignee", ["MF-06"]), true);
add("identical free-form Good label contradicts finding", judgment, review([finding("MF-06", "Story spelling")], "Story spelling", ["MF-06"]), false);
add("compound AI label with unrelated Good", judgment, review([mf06], "Problem statement, Estimate", ["MF-06"]), true);
add("two Must Fix IDs", judgment, both, true);
add("verdict ID order is immaterial", judgment, both.replace(": MF-05, MF-06", ": MF-06, MF-05"), true);
add("multiple findings for one rule", judgment, review([mf06, finding("MF-06", "Acceptance criteria", "Another typo.")], "Estimate", ["MF-06"]), true);
add("missing Must Fix verdict ID", judgment, both.replace(": MF-05, MF-06", ": MF-05"), false);
add("extra Must Fix verdict ID", judgment, review([mf05], "Assignee", ["MF-05", "MF-06"]), false);
add("Heads Up ID in blocked verdict", judgment, review([mf05], "Assignee", ["MF-05", "HU-01"]), false);
add("unknown ID in blocked verdict", judgment, review([mf05], "Assignee", ["MF-05", "MF-999"]), false);
add("substring ID does not satisfy a finding", judgment, review([mf05], "Assignee", ["MF-050"]), false);
add("missing verdict separator", judgment, both.replace(": MF-05, MF-06", " MF-05, MF-06"), false);
add("verdict trailing comma", judgment, both + ",", false);
add("clear verdict with Must Fix", judgment, review([mf05], "Assignee"), false);
add("blocked verdict without Must Fix", clean, review([], "Assignee", ["MF-05"]), false);
// This is deliberately a structural verifier, not a second AI reviewer.
add("AI omissions remain outside verification", judgment, review([], "Problem statement"), true);

const custom = structuredClone(rules);
custom.sections.problem_statement.aliases.push("Business Need");
add("Good recognizes a custom section alias", missingProblem, correctMissing.replace("✅ Good | User story", "✅ Good | Business Need"), false, custom);
custom.sections.problem_statement.aliases.push("Business Need and Goal");
add("compound alias inside a Good list", missingProblem, correctMissing.replace("✅ Good | User story", "✅ Good | Estimate, Business Need and Goal"), false, custom);
const deferred = structuredClone(rules);
deferred.team_pack.rules.find((r) => r.id === "TP-01").bucket = "must_fix";
const deferredTicket = clean + "\nRelease note:\nN/A\n";
const deferredReview = review(["🔴 Must Fix | TP-01 | User-facing message | Missing change message."], "Problem statement", ["TP-01"]);
add("code rule explicitly deferred to AI is allowed", deferredTicket, deferredReview, true, deferred);
const disabled = structuredClone(rules);
disabled.rules.find((r) => r.id === "HU-01").bucket = "off";
add("disabled code rule stays rejected", clean, review([finding("HU-01", "Estimate")]), false, disabled);
add("ignored rule stays rejected", clean, review(["🟡 Heads Up | IG-01 | Dates | Placeholder."]), false);
add("wrong bucket stays rejected", judgment, review(["🟡 Heads Up | MF-05 | Acceptance criteria | Untestable."]), false);

for (const c of cases) {
  test("verify: " + c.name, () => {
    const result = verifyReview(c.review, check(c.ticket, c.rules), c.rules);
    assert.equal(result.passed, c.passed, JSON.stringify(result));
  });
}

test("Python and JavaScript agree on every verification regression", () => {
  const script = [
    "import json,sys",
    "sys.path.insert(0,'python')",
    "import slicecheck as s",
    "cases=json.load(sys.stdin)",
    "print(json.dumps([s.verify_review(c['review'],s.check_ticket(c['ticket'],c['rules']),c['rules']) for c in cases]))",
  ].join("\n");
  const actual = JSON.parse(runPython(["-c", script], { input: JSON.stringify(cases) }));
  const expected = cases.map((c) => verifyReview(c.review, check(c.ticket, c.rules), c.rules));
  assert.deepEqual(actual, expected);
});

test("Node CLI, bundled skill and every Python kit reject invalid reviews and accept valid ones", () => {
  withTempDir((dir) => {
    const ticketFile = path.join(dir, "ticket.txt");
    const reviewFile = path.join(dir, "review.txt");
    const copilot = path.join(dir, "copilot");
    fs.mkdirSync(copilot);
    fs.copyFileSync("kits/copilot/slicecheck.py.txt", path.join(copilot, "slicecheck.py"));
    fs.copyFileSync("kits/copilot/rules.json.txt", path.join(copilot, "rules.json"));
    const engines = [
      "bin/slicecheck.mjs", "skills/slicecheck/scripts/slicecheck.mjs",
      "python/slicecheck.py", "skills/slicecheck/scripts/slicecheck.py",
      "kits/chatgpt/slicecheck.py", path.join(copilot, "slicecheck.py"),
    ];
    // One real review and one isolated regression for each new guarantee.
    const names = ["real code findings", "invented Must Fix code finding", "real code finding with wrong section",
      "compound AI label contradicts Good", "extra Must Fix verdict ID"];
    for (const name of names) {
      const c = cases.find((c) => c.name === name);
      fs.writeFileSync(ticketFile, c.ticket);
      fs.writeFileSync(reviewFile, c.review);
      for (const engine of engines) {
        const args = [engine, "verify", ticketFile, reviewFile, "--json"];
        let output;
        if (engine.endsWith(".py")) {
          try { output = runPython(args); }
          catch (error) { assert.equal(error.status, 2, engine); output = error.stdout; }
        } else {
          const result = spawnSync(process.execPath, args, { encoding: "utf8" });
          assert.ifError(result.error);
          assert.equal(result.status, c.passed ? 0 : 2, engine);
          output = result.stdout;
        }
        assert.equal(JSON.parse(output).passed, c.passed, engine + ": " + name);
      }
    }
  });
});
