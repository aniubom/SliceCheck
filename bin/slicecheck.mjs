#!/usr/bin/env node
// SliceCheck command line.
//   slicecheck check  <ticket-file>                  code findings only
//   slicecheck prompt <ticket-file>                  full review prompt for any AI
//   slicecheck verify <ticket-file> <review-file>    check an AI review against the rules
// Options: --rules <path>   (default: ./slicecheck.rules.yaml, then the shipped rules.yaml)
//          --json           machine-readable output

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { parseTicket } from "../src/parse.js";
import { checkTicket, findingText } from "../src/check.js";
import { buildPrompt, buildStandalonePrompt } from "../src/prompt.js";
import { verifyReview } from "../src/verify.js";
import { renderReview } from "../src/render.js";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const json = args.includes("--json");
if (json) args.splice(args.indexOf("--json"), 1);
const rulesArg = flag("--rules");
const [cmd, ticketPath, reviewPath] = args;
// Rules: --rules <path>, else the team's file in the current folder
// (slicecheck.rules.yaml or .json), else rules.json beside this script (the
// skill and single-file downloads), else the repo's rules.yaml.
const here = path.dirname(fileURLToPath(import.meta.url));
const rulesPath =
  rulesArg ||
  ["slicecheck.rules.yaml", "slicecheck.rules.json", path.join(here, "rules.json"), path.join(here, "..", "rules.yaml")]
    .find((p) => fs.existsSync(p));

// "-" reads from standard input, so agents can pipe text without saving a file.
const readInput = (p) => fs.readFileSync(p === "-" ? 0 : p, "utf8");

if (cmd === "standalone") {
  console.log(buildStandalonePrompt(yaml.load(fs.readFileSync(rulesPath, "utf8"))));
  process.exit(0);
}
if (cmd === "rules") {
  console.log(fs.readFileSync(rulesPath, "utf8"));
  process.exit(0);
}

function usage(code = 1) {
  console.log(`SliceCheck: ticket peer review, minus the noise.

  slicecheck check  <ticket-file>                  code findings only
  slicecheck prompt <ticket-file>                  full review prompt for any AI
  slicecheck verify <ticket-file> <review-file>    check an AI review against the rules
  slicecheck standalone                            one-time prompt for Copilot/ChatGPT (no scripts)
  slicecheck rules                                 print the rules in use

  Use "-" as a file name to read from standard input.

  Options: --rules <path>   --json`);
  process.exit(code);
}

if (!cmd || !ticketPath || !["check", "prompt", "verify"].includes(cmd)) usage();
if (cmd === "verify" && !reviewPath) usage();

const rules = yaml.load(fs.readFileSync(rulesPath, "utf8"));
const ticketText = readInput(ticketPath);
const result = checkTicket(parseTicket(ticketText, rules), rules);
const L = rules.output.labels;

if (cmd === "check") {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Stage: ${result.stage}`);
    if (result.notFound.length) console.log(`Sections not found: ${result.notFound.join(", ")}`);
    if (!result.findings.length) console.log("No code findings.");
    for (const f of result.findings) {
      console.log(`${L[f.bucket]} | ${f.id} | ${f.section} | ${findingText(f)}`);
    }
    console.log(`Judgment rules for the AI: ${result.aiRules.map((r) => r.id).join(", ") || "none"}`);
  }
  process.exit(0);
}

if (cmd === "prompt") {
  console.log(buildPrompt(ticketText, result, rules));
  process.exit(0);
}

if (cmd === "verify") {
  const reviewText = readInput(reviewPath);
  const res = verifyReview(reviewText, result, rules);
  if (res.passed) res.rendered = renderReview(reviewText, rules);
  if (json) console.log(JSON.stringify(res, null, 2));
  else if (res.passed) console.log(`PASS. Show the user exactly this, nothing before or after:\n\n${res.rendered}`);
  else {
    console.log("FAIL: the review breaks the rules:");
    for (const p of res.problems) console.log(`- ${p}`);
  }
  process.exit(res.passed ? 0 : 2);
}
