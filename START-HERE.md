# START HERE (for AI agents)

You are running **SliceCheck**: ticket peer review, minus the noise.
A user wants a ticket (user story, acceptance criteria, fields) peer reviewed. Follow this page exactly.

## Source of truth

The rules decide everything: which sections to look for, what counts as Must Fix, Heads Up or Ignore, and the exact output format. They live in `rules.yaml` (and the same rules as JSON in `python/rules.json`). If the user's project has its own `slicecheck.rules.yaml` or `slicecheck.rules.json`, use that instead. Never review from memory or add rules of your own.

## Pick your path

**A. You can run code and have the repo files** (cloned repo, or files loaded into your code tool):
- With Node: `node bin/slicecheck.mjs <command> ...` (needs `npm install` once in the repo), or `node skills/slicecheck/scripts/slicecheck.mjs <command> ...` (nothing to install).
- With Python 3: `python3 python/slicecheck.py <command> ...` (nothing to install). Needs `python/slicecheck.py` and `python/rules.json` side by side.
- Then follow **Steps** below.

**B. You can run Python but only read the repo** (for example a chat AI with a code tool and GitHub or web access): load `python/slicecheck.py` and `python/rules.json` into your code tool, save them as files, then follow **Steps** with the Python commands.

**C. You can't run code:** read `rules.yaml` and do the review yourself, following **Steps 3 and 6**. Apply every rule with bucket `must_fix` or `heads_up` (respect each rule's `when` and the ticket's stage from `stages`), never flag `ignore` rules, and skip `off`. End with one line: *"Reviewed without SliceCheck's scripts, so this review wasn't verified."*

## Steps

1. **Save the ticket** to `ticket.txt`, exactly as the user wrote it. Don't fix or summarize it.

2. **Get the review instructions:**
   ```
   python3 python/slicecheck.py prompt ticket.txt
   ```
   (or `node bin/slicecheck.mjs prompt ticket.txt`). It prints the code findings (final, copy them as-is), the judgment rules for you to check, the items you must never flag, and the exact output format.

3. **Write the review** in that format to `review.txt`: `FINDINGS`, `GOOD`, `VERDICT`.
   - Copy every code finding.
   - Add a judgment finding only when a rule is clearly broken, and cite its rule ID.
   - Never mention anything on the never-flag list.
   - Verdict: any Must Fix means "🔴 Needs attention before refinement: " plus the Must Fix IDs; otherwise "✅ Clear to proceed".

4. **Verify it:**
   ```
   python3 python/slicecheck.py verify ticket.txt review.txt
   ```
   - **PASS:** go to step 5.
   - **FAIL:** fix every listed problem and verify again. Never show a review that failed.

5. **Delete** `ticket.txt` and `review.txt`.

6. **Show the user only the review**, formatted like this (leave out an empty bucket):

   **SliceCheck review**

   🔴 **Must Fix**
   - **MF-02 · Problem statement:** the specific note

   🟡 **Heads Up**
   - **HU-03 · Acceptance criteria:** the specific note

   ✅ **Good:** sections with no findings

   **Verdict:** the verdict line

   If some sections couldn't be found, add one line after the verdict: *"Couldn't find: ..."*. No preamble, no extra advice.

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need"), copy the default rules to `slicecheck.rules.yaml` (or `slicecheck.rules.json` for Python) in their project, edit that copy, and tell them which rule ID changed. Never edit the defaults for one team's preferences.

## Never

- Never invent rules, or findings that no rule covers.
- Never give a verdict that contradicts the findings.
- Never store, repeat or share ticket content outside the review.
- Never add real ticket content to this repo's examples.
