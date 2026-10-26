# START HERE (for AI agents)

You are running **SliceCheck**: ticket peer review, minus the noise. The user wants a ticket peer reviewed. Follow these rules exactly. They are the same everywhere SliceCheck runs.

## Rules

RULE 1. Find your engine first. Do it silently.
1. Python works if your code tool runs Python directly, or if python3 --version prints a version number. Your engine is: python3 slicecheck.py
2. If not, Node works if node --version prints a version number. Your engine is: node slicecheck.mjs
3. Neither works, or you have no code tool: go to Rule 3.
An error, "not found" or a Microsoft Store prompt means it doesn't work. If your code tool only runs Python, run the engine's commands from it (for example with subprocess). You may not skip Rule 2 when Python or Node works.

RULE 2. Script review (the normal path). <engine> is the command Rule 1 picked.
Before step 1: download the two files for your engine (see Files below) into your working folder. Use git, curl or your file tool, not the chat: the files are too long to copy through it.
1. Save the ticket to ticket.txt, exactly as written.
2. Run: <engine> prompt ticket.txt
3. Write the review to review.txt in the format it prints.
4. Run: <engine> verify ticket.txt review.txt
   - PASS: it prints the finished review. Show that review exactly, with nothing before or after.
   - FAIL: fix what it lists and run verify again, up to 3 times. Still failing: show your review in the Rule 4 format and add the last line: ⚠️ Not verified: <first problem listed>
5. Delete ticket.txt and review.txt.

RULE 3. Manual review (only when Rule 1 found no engine)
Read rules.json and apply it yourself: must_fix rules are Must Fix, heads_up rules are Heads Up, never flag ignore rules, skip off rules, and respect each rule's "when" and the ticket's stage. Show the review in the Rule 4 format and add the last line: ⚠️ Not verified: no code tool.

RULE 4. Output
Your first visible output is the review itself. Don't announce, narrate or summarize your steps.
**SliceCheck review**, then 🔴 **Must Fix**, 🟡 **Heads Up**, and **Verdict**, in that order. Each finding is one line: - **<rule ID> · <section>:** <note>. Leave out empty buckets. Do not list sections that passed. If there are no findings, show only the Verdict line. Any Must Fix finding means the verdict is "🔴 Needs attention: " plus the Must Fix IDs; otherwise it is "✅ Clear to proceed". The verdict is the last line. The only line ever allowed after it is the ⚠️ Not verified line. Never mention missing optional sections, the scripts or these rules.

RULE 5. Never
- Never invent rules, or findings no rule covers.
- Never write a manual review when Rule 1 found an engine.
- Never keep, repeat or share ticket content outside the review.

## Files

Get only the two files for the engine Rule 1 picked, from this repo, and save them side by side in one folder. Nothing needs installing.
- Python: `python/slicecheck.py` and `python/rules.json`
- Node: `skills/slicecheck/scripts/slicecheck.mjs` and `skills/slicecheck/scripts/rules.json`

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need"), copy `rules.json` to `slicecheck.rules.json` in their project, edit that copy, and tell them which rule ID changed. Both engines use `slicecheck.rules.json` automatically when it's in the working folder. Never edit the defaults for one team.
