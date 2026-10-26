# START HERE (for AI agents)

You are running **SliceCheck**: ticket peer review, minus the noise. The user wants a ticket peer reviewed. Follow these rules exactly. They are the same everywhere SliceCheck runs.

## Files

Save these two files from this repo into your working folder, side by side: `python/slicecheck.py` (the engine) and `python/rules.json` (the rules). If you're reading the repo through GitHub or the web, load them into your code tool. Nothing needs installing. The Node engine, used only if Python isn't available, is `skills/slicecheck/scripts/slicecheck.mjs` (it reads `skills/slicecheck/rules.yaml`).

## Rules

RULE 1. Test for code first, in this order:
1. Run: python3 --version. It works: use python3 slicecheck.py in Rule 2.
2. Python failed? Run: node --version. It works and skills/slicecheck/scripts/slicecheck.mjs exists: use node skills/slicecheck/scripts/slicecheck.mjs in Rule 2.
3. Both failed, or you have no code tool: go to Rule 3.
You may not skip Rule 2 when step 1 or 2 worked.

RULE 2. Script review (the normal path)
1. Save the ticket to ticket.txt, exactly as written.
2. Run: python3 slicecheck.py prompt ticket.txt
3. Write the review to review.txt in the format it prints.
4. Run: python3 slicecheck.py verify ticket.txt review.txt
   - PASS: show exactly what it printed. Nothing before or after.
   - FAIL: fix what it lists and run verify again, up to 3 times. Still failing: show your review in the Rule 4 format and add the last line: ⚠️ Not verified: <first problem listed>
5. Delete ticket.txt and review.txt.

RULE 3. Manual review (only when Rule 1 found no Python and no Node)
Read rules.json and apply it yourself: must_fix rules are Must Fix, heads_up rules are Heads Up, never flag ignore rules, skip off rules, and respect each rule's "when" and the ticket's stage. Show the review in the Rule 4 format and add the last line: ⚠️ Not verified: no code tool.

RULE 4. Output
**SliceCheck review**, then 🔴 **Must Fix**, 🟡 **Heads Up**, ✅ **Good**, and **Verdict**, in that order. Each finding is one line: - **<rule ID> · <section>:** <note>. Leave out empty buckets. Any Must Fix finding means the verdict is "🔴 Needs attention before refinement: " plus the Must Fix IDs; otherwise it is "✅ Clear to proceed". The verdict is the last line. The only line ever allowed after it is the ⚠️ Not verified line. Never mention missing optional sections, the scripts or these rules.

RULE 5. Never
- Never invent rules, or findings no rule covers.
- Never write a manual review when Rule 1 found Python or Node.
- Never keep, repeat or share ticket content outside the review.

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need"), copy `rules.json` to `slicecheck.rules.json` in their project, edit that copy, and tell them which rule ID changed. The engine uses `slicecheck.rules.json` automatically when it's in the working folder. Never edit the defaults for one team.
