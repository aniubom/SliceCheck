---
name: slicecheck
description: Ticket peer review, minus the noise. Reviews a user story or ticket (problem statement, user story, acceptance criteria, fields) and sorts findings into Must Fix, Heads Up and Ignore using SliceCheck's rules, with scripts that check the mechanical rules and verify every review. Use when someone asks to peer review, check, QA or "slice check" a ticket, user story or requirements.
---

# SliceCheck

Follow these rules exactly. Paths are relative to this skill's folder. Nothing to install.

## Rules

RULE 1. Find your engine first. Do it silently.
1. Python works if your code tool runs Python directly, or if python3 --version prints a version number. Your engine is: python3 scripts/slicecheck.py
2. If not, Node works if node --version prints a version number. Your engine is: node scripts/slicecheck.mjs
3. Neither works, or you have no code tool: go to Rule 3.
An error, "not found" or a Microsoft Store prompt means it doesn't work. If your code tool only runs Python, run the engine's commands from it (for example with subprocess). You may not skip Rule 2 when Python or Node works.

RULE 2. Script review (the normal path). <engine> is the command Rule 1 picked.
1. Save the ticket to ticket.txt, exactly as written.
2. Run: <engine> prompt ticket.txt
3. Write the review to review.txt in the format it prints.
4. Run: <engine> verify ticket.txt review.txt
   - PASS: it prints the finished review. Show that review exactly, with nothing before or after.
   - FAIL: fix what it lists and run verify again, up to 3 times. Still failing: show your review in the Rule 4 format and add the last line: ⚠️ Not verified: <first problem listed>
5. Delete ticket.txt and review.txt.

RULE 3. Manual review (only when Rule 1 found no engine)
Read scripts/rules.json and apply it yourself: must_fix rules are Must Fix, heads_up rules are Heads Up, never flag ignore rules, skip off rules, and respect each rule's "when" and the ticket's stage. Show the review in the Rule 4 format and add the last line: ⚠️ Not verified: no code tool.

RULE 4. Output
Your first visible output is the review itself. Don't announce, narrate or summarize your steps.
**SliceCheck review**, then 🔴 **Must Fix**, 🟡 **Heads Up**, ✅ **Good**, and **Verdict**, in that order. Each finding is one line: - **<rule ID> · <section>:** <note>. Leave out empty buckets. Any Must Fix finding means the verdict is "🔴 Needs attention: " plus the Must Fix IDs; otherwise it is "✅ Clear to proceed". The verdict is the last line. The only line ever allowed after it is the ⚠️ Not verified line. Never mention missing optional sections, the scripts or these rules.

RULE 5. Never
- Never invent rules, or findings no rule covers.
- Never write a manual review when Rule 1 found an engine.
- Never keep, repeat or share ticket content outside the review.

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need", "turn on the approval rule"), copy `scripts/rules.json` to `slicecheck.rules.json` in their project, edit that copy, and tell them which rule ID changed. Both engines use the team file automatically. Never edit the defaults in this folder for one team.
