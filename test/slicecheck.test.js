import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import yaml from "js-yaml";
import { parseTicket } from "../src/parse.js";
import { checkTicket } from "../src/check.js";
import { buildPrompt } from "../src/prompt.js";
import { verifyReview } from "../src/verify.js";

const rules = yaml.load(fs.readFileSync("rules.yaml", "utf8"));
const expected = yaml.load(fs.readFileSync("examples/expected.yaml", "utf8"));
const read = (f) => fs.readFileSync(`examples/${f}`, "utf8");
const run = (text, r = rules) => checkTicket(parseTicket(text, r), r);

for (const [file, exp] of Object.entries(expected)) {
  test(`${file}: stage and code findings`, () => {
    const out = run(read(file));
    assert.equal(out.stage, exp.stage);
    assert.deepEqual(out.findings.map((f) => f.id).sort(), [...exp.code].sort());
  });
}

test("every rule ID is unique", () => {
  const ids = [...rules.rules, ...rules.team_pack.rules].map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("prompt carries code findings, judgment rules and the ignore list", () => {
  const text = read("02-wrike-in-dev.txt");
  const prompt = buildPrompt(text, run(text), rules);
  for (const id of ["HU-01", "HU-04", "MF-02", "IG-01"]) assert.ok(prompt.includes(id), id);
});

test("team pack rule stays off until a team turns it on", () => {
  const text = read("02-wrike-in-dev.txt").replace("NA\nNotes:", "See the approval workflow\nNotes:");
  assert.ok(!run(text).findings.some((f) => f.id === "TP-03"));
  const on = structuredClone(rules);
  on.team_pack.rules.find((r) => r.id === "TP-03").bucket = "heads_up";
  assert.ok(run(text, on).findings.some((f) => f.id === "TP-03"));
  // Process flow marked NA: the diagram isn't required.
  assert.ok(!run(read("02-wrike-in-dev.txt"), on).findings.some((f) => f.id === "TP-03"));
});

test("verify passes a correct review and rejects a bad one", () => {
  const out = run(read("02-wrike-in-dev.txt"));
  const good = `FINDINGS
🟡 Heads Up | HU-01 | Estimate | Empty.
🟡 Heads Up | HU-02 | Assignee | Empty while In Dev.
🟡 Heads Up | HU-03 | Acceptance criteria | Starts at AC-2.
🟡 Heads Up | HU-04 | Whole ticket | Notes repeated.
GOOD
✅ Good | Problem statement, User story
VERDICT
✅ Clear to proceed`;
  assert.equal(verifyReview(good, out, rules).passed, true);

  const bad = `FINDINGS
🔴 Must Fix | MF-02 | Problem statement | Vague.
🟡 Heads Up | IG-04 | Assignee | Empty.
GOOD
✅ Good | User story
VERDICT
✅ Clear to proceed`;
  const res = verifyReview(bad, out, rules);
  assert.equal(res.passed, false);
  assert.ok(res.problems.some((p) => p.includes("ignored item")));
  assert.ok(res.problems.some((p) => p.includes("Dropped a code finding")));
  assert.ok(res.problems.some((p) => p.includes("Verdict contradicts")));
});
