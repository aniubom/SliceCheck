import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("MCP server: check, verify and rules tools work end to end", async () => {
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StdioClientTransport({ command: "node", args: ["mcp/server.mjs"] }));
  try {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    assert.deepEqual(tools, ["check_ticket", "get_rules", "verify_review"]);

    const ticket = fs.readFileSync("examples/02-wrike-in-dev.txt", "utf8");
    const check = await client.callTool({ name: "check_ticket", arguments: { ticket } });
    assert.ok(check.content[0].text.includes("HU-04"));

    const good = `FINDINGS
🟡 Heads Up | HU-01 | Estimate | Empty.
🟡 Heads Up | HU-02 | Assignee | Empty while In Dev.
🟡 Heads Up | HU-03 | Acceptance criteria | Starts at AC-2.
🟡 Heads Up | HU-04 | Whole ticket | Notes repeated.
GOOD
✅ Good | Problem statement
VERDICT
✅ Clear to proceed`;
    const pass = await client.callTool({ name: "verify_review", arguments: { ticket, review: good } });
    assert.ok(pass.content[0].text.startsWith("PASS"));

    const fail = await client.callTool({ name: "verify_review", arguments: { ticket, review: good.replace(/🟡 Heads Up \| HU-04.*\n/, "") } });
    assert.ok(fail.content[0].text.startsWith("FAIL"));

    const rules = await client.callTool({ name: "get_rules", arguments: {} });
    assert.ok(rules.content[0].text.includes("MF-01"));
  } finally {
    await client.close();
  }
});
