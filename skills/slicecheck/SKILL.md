---
name: slicecheck
description: Ticket peer review, minus the noise. Reviews a user story or ticket (problem statement, user story, acceptance criteria, fields) and sorts findings into Must Fix, Heads Up and Ignore using rules.yaml. Mechanical rules are checked by script and every review is verified before it is shown. Use when someone asks to peer review, check, QA or "slice check" a ticket, user story or requirements.
---

# SliceCheck

Peer review a ticket against `rules.yaml`. Scripts check the mechanical rules and verify your review, so the result is the same every time. Paths below are relative to this skill's folder.

No install step. Use Node if it's available (`node --version`); otherwise use Python 3, which runs the same engine:
- Node: `node scripts/slicecheck.mjs <command> ...`
- Python: `python3 scripts/slicecheck.py <command> ... --rules scripts/rules.json` (on Windows, `python` or `py`)

The commands below show Node. With Python, swap the start of the command; everything else is identical.

## Review a ticket

1. **Get the ticket.** Use the user's text exactly as written. Do not summarize or fix it.

2. **Run the code checks.** Pipe the ticket in:
   ```bash
   node scripts/slicecheck.mjs check - <<'TICKET'
   <the ticket, exactly as written>
   TICKET
   ```
   These findings are final. Never drop them or change their bucket.

3. **Get your instructions.** Same ticket, `prompt` instead of `check`:
   ```bash
   node scripts/slicecheck.mjs prompt - <<'TICKET'
   <the ticket>
   TICKET
   ```
   It prints the code findings to copy, the judgment rules for you to check, the items you must never flag, and the exact output format. Follow it exactly.

4. **Write the review** in that format: `FINDINGS`, `GOOD`, `VERDICT`. Save it to a file (for example `review.txt`), or keep it ready to pipe.
   - Copy every code finding.
   - Add a judgment finding only when a rule is clearly broken. Cite its rule ID.
   - Never mention anything on the never-flag list.

5. **Verify it.** Save the ticket to `ticket.txt`, then:
   ```bash
   node scripts/slicecheck.mjs verify ticket.txt review.txt
   ```
   - `PASS`: go to step 6.
   - `FAIL`: fix every listed problem, then verify again. Never show a review that failed.

6. **Show the user the verified review** as a clean, readable result:

   **SliceCheck review**

   🔴 **Must Fix**
   - **MF-02 · Problem statement:** the specific note

   🟡 **Heads Up**
   - **HU-03 · Acceptance criteria:** the specific note

   ✅ **Good:** Problem statement, User story

   **Verdict:** ✅ Clear to proceed

   Leave out an empty bucket. If the check reported sections it couldn't find, add one line after the verdict: *"Couldn't find: Dependencies."* Nothing else: no preamble, no extra advice.

7. Delete any temporary files you created.

## Change the rules

Default rules ship in `rules.yaml` in this folder. A team's own rules live in `slicecheck.rules.yaml` in their project folder, and the script uses that file automatically when it's there.

When the user asks for a change ("stop flagging empty estimates", "we call it Business Need", "turn on the approval rule"):
1. If `slicecheck.rules.yaml` doesn't exist in their project yet, create it: `node scripts/slicecheck.mjs rules > slicecheck.rules.yaml`
2. Edit that file. Change a rule's `bucket`, add a section alias, add a stage word, or switch a `team_pack` rule from `off` to a bucket.
3. Run the check on any ticket to make sure the file still loads.
4. Tell the user which rule ID you changed and what it does now.

When running with Python, the team file is `slicecheck.rules.json` instead (same content, JSON format). Create it with `python3 scripts/slicecheck.py` reading `scripts/rules.json` as the starting copy.

Never edit the default `rules.yaml` in this folder for one team's preferences.

## If you can't run scripts

Some environments can't run code at all. Then read `rules.yaml`, apply every rule yourself, and use the same output. Add one line at the end: *"Reviewed without SliceCheck's scripts, so this review wasn't verified."*

## Never

- Never invent rules, or findings that no rule covers.
- Never give a verdict that contradicts the findings. Any Must Fix means "🔴 Needs attention before refinement".
- Never store or repeat ticket content anywhere except this review.
