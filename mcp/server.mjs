#!/usr/bin/env node
// SliceCheck MCP server.
// Lets any MCP-capable AI (Claude, ChatGPT, VS Code Copilot, Copilot Studio,
// Cursor...) run SliceCheck as tools inside the chat. Runs on the user's own
// machine over stdio. The ticket still goes to the AI app that calls it.
//
// Rules: SLICECHECK_RULES env var, else ./slicecheck.rules.yaml in the working
// folder, else the default rules.yaml shipped with SliceCheck.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseTicket } from "../src/parse.js";
import { checkTicket } from "../src/check.js";
import { buildPrompt } from "../src/prompt.js";
import { verifyReview } from "../src/verify.js";
import { renderReview } from "../src/render.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function rulesPath() {
  if (process.env.SLICECHECK_RULES) return process.env.SLICECHECK_RULES;
  if (fs.existsSync("slicecheck.rules.yaml")) return "slicecheck.rules.yaml";
  return path.join(here, "..", "rules.yaml");
}
// Read fresh on every call, so rule edits apply without a restart.
const loadRules = () => yaml.load(fs.readFileSync(rulesPath(), "utf8"));
const text = (s) => ({ content: [{ type: "text", text: s }] });

const server = new McpServer(
  { name: "slicecheck", version: "0.1.0" },
  {
    instructions: `SliceCheck: ticket peer review, minus the noise.
When the user asks to peer review, check or QA a ticket or user story, always use these tools. Never review the ticket yourself without them.
1. Call check_ticket with the ticket exactly as written. It returns the code findings (final) and your review instructions.
2. Write the review exactly as instructed: FINDINGS, GOOD, VERDICT.
3. Call verify_review with the same ticket and your review. FAIL: fix every problem and call it again.
4. On PASS, show the user exactly the review it returns, nothing before or after. Don't mention the tools or the verification.`,
  }
);

server.registerTool(
  "check_ticket",
  {
    title: "Check a ticket",
    description:
      "Step 1 of a SliceCheck peer review. Runs the code rules on a ticket and returns the code findings plus the exact instructions for writing the review.",
    inputSchema: { ticket: z.string().describe("The full ticket text, exactly as the user gave it.") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ ticket }) => {
    const rules = loadRules();
    const result = checkTicket(parseTicket(ticket, rules), rules);
    return text(buildPrompt(ticket, result, rules));
  }
);

server.registerTool(
  "verify_review",
  {
    title: "Verify a review",
    description:
      "Step 2 of a SliceCheck peer review. Checks your written review against the rules. Returns PASS, or the problems to fix before showing it.",
    inputSchema: {
      ticket: z.string().describe("The same ticket text sent to check_ticket."),
      review: z.string().describe("Your review in the FINDINGS / GOOD / VERDICT format."),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ ticket, review }) => {
    const rules = loadRules();
    const result = checkTicket(parseTicket(ticket, rules), rules);
    const res = verifyReview(review, result, rules);
    return text(
      res.passed
        ? `PASS. Show the user exactly this, nothing before or after:\n\n${renderReview(review, rules)}`
        : `FAIL: fix these, then call verify_review again:\n${res.problems.map((p) => `- ${p}`).join("\n")}`
    );
  }
);

server.registerTool(
  "get_rules",
  {
    title: "Show the rules",
    description: "Returns the SliceCheck rules in use (rules.yaml), so you can explain or change them.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async () => text(`Rules file: ${rulesPath()}\n\n${fs.readFileSync(rulesPath(), "utf8")}`)
);

await server.connect(new StdioServerTransport());
