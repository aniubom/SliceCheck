---
name: slicecheck
description: Ticket peer review, minus the noise. Reviews a user story or ticket (problem statement, user story, acceptance criteria, fields) and sorts findings into Must Fix, Heads Up and Ignore using SliceCheck's rules, with scripts that check the mechanical rules and verify every review. Use when someone asks to peer review, check, QA or "slice check" a ticket, user story or requirements.
---

# SliceCheck

**You must run the scripts.** Do not read the rules and review the ticket yourself; that is not a SliceCheck review even if it looks right. Review without the scripts only after you tried to run them and they failed (see **No code**).

Paths are relative to this skill's folder. Nothing to install. Use Python 3 or Node, whichever works:
- Python: `python3 scripts/slicecheck.py` (on Windows: `python` or `py`)
- Node: `node scripts/slicecheck.mjs`

Commands below use Python; with Node, swap the start of the command.

## Review a ticket

1. Save the ticket to `ticket.txt` exactly as the user wrote it.

2. Get your instructions:
   ```bash
   python3 scripts/slicecheck.py prompt ticket.txt
   ```
   It prints the code findings (final, copy them as-is), the judgment rules for you to check, what you must never flag, and the exact format.

3. Write the review in that format to `review.txt`. Add a judgment finding only when a rule is clearly broken.

4. Verify:
   ```bash
   python3 scripts/slicecheck.py verify ticket.txt review.txt
   ```
   - **PASS:** it prints the final review.
   - **FAIL:** fix every listed problem and verify again. After 3 failed tries, show your last review with one line at the end: `⚠️ Not verified: <the first problem it listed>`.

5. Show the user **exactly** the review verify printed. Nothing before or after. Don't mention the scripts or the verification; it runs silently.

6. Delete `ticket.txt` and `review.txt`.

## Change the rules

A team's own rules live in their project folder: `slicecheck.rules.json` (Python) or `slicecheck.rules.yaml` (Node). The scripts use it automatically when it's there.

When the user asks for a change ("stop flagging empty estimates", "we call it Business Need", "turn on the approval rule"):
1. If the team file doesn't exist yet, copy `scripts/rules.json` (Python) or `rules.yaml` (Node) into their project under that name.
2. Edit it: change a rule's `bucket`, add a section alias under `sections`, add a stage word under `stages`, or switch a `team_pack` rule from `off` to a bucket.
3. Run `prompt` on any ticket to make sure the file still loads.
4. Tell the user which rule ID you changed and what it does now.

Never edit the defaults in this folder for one team's preferences.

## No code

Only if you tried and couldn't run the scripts: follow `rules.yaml` yourself (every `must_fix` and `heads_up` rule, respecting `when` and the ticket's stage; never flag `ignore` rules; skip `off`). Use the same result format as a verified review (bold "SliceCheck review" title, 🔴 Must Fix, 🟡 Heads Up, ✅ Good, Verdict; leave out empty buckets; any Must Fix means "🔴 Needs attention before refinement: " plus the IDs, otherwise "✅ Clear to proceed"). End with one line: `⚠️ Not verified: SliceCheck's scripts couldn't run here.`

## Never

- Never review without the scripts when you can run code.
- Never invent rules, or findings that no rule covers.
- Never store, repeat or share ticket content outside the review.
