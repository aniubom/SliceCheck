// SliceCheck prompt builder.
// Packages the ticket, the code findings, and the AI rules into one prompt
// that works in Copilot, ChatGPT or Claude. The rules travel with every run,
// so nothing depends on the AI remembering them.

const listSections = (s) => (Array.isArray(s) ? s : [s]).map((n) => n.replace(/_/g, " ")).join(", ");

export function buildPrompt(ticketText, result, rules) {
  const L = rules.output.labels;
  const V = rules.output.verdict;

  const codeLines = result.findings.length
    ? result.findings
        .map((f) => `${L[f.bucket]} | ${f.id} | ${f.section} | ${f.message} (${f.detail})`)
        .join("\n")
    : "(none)";

  const aiLines = result.aiRules.length
    ? result.aiRules
        .map((r) => `- ${r.id} [${r.bucket === "must_fix" ? L.must_fix : L.heads_up}] (${listSections(r.section)}): ${r.message}${r.note ? " Note: " + r.note : ""}`)
        .join("\n")
    : "(none)";

  const ignoreLines = result.ignoreRules.length
    ? result.ignoreRules.map((r) => `- ${r.id}: ${r.message}`).join("\n")
    : "(none)";

  const notFound = result.notFound.length
    ? `These sections could not be found in the ticket: ${result.notFound.map((n) => n.replace(/_/g, " ")).join(", ")}. Do not guess their content. Skip AI rules for them.`
    : "All sections the rules need were found.";

  return `You are SliceCheck, a ticket peer reviewer. Review the ticket below using ONLY these rules. Do not add findings that no rule covers.

TICKET STAGE: ${result.stage}
${notFound}

STEP 1. CODE FINDINGS (already checked by script; copy every line exactly as written, do not drop or change any):
${codeLines}

STEP 2. JUDGMENT RULES (check each one against the ticket; report a finding only if the rule is clearly broken):
${aiLines}

STEP 3. NEVER FLAG THESE (they are expected; mentioning them is an error):
${ignoreLines}

OUTPUT FORMAT (use exactly this, nothing before or after):
FINDINGS
<one line per finding: label | rule ID | section | specific note>
GOOD
${L.good} | <comma-separated sections with no findings>
VERDICT
<exactly one line>

RULES FOR THE OUTPUT:
- Labels are exactly "${L.must_fix}" and "${L.heads_up}". Every finding cites one rule ID from the lists above.
- If there are no findings, write "(none)" under FINDINGS.
- VERDICT LOGIC (follow exactly): if there is at least one ${L.must_fix} finding, the verdict line is "${V.blocked}: " followed by the Must Fix rule IDs. Otherwise the verdict line is "${V.clear}".
- One verdict line only. No extra commentary.

TICKET:
"""
${ticketText.trim()}
"""`;
}
