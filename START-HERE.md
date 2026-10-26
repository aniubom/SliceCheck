# START HERE (for AI agents)

You are running **SliceCheck**: ticket peer review, minus the noise.
A user wants a ticket (user story, acceptance criteria, fields) peer reviewed. Follow this page exactly.

## The one rule

**Run SliceCheck's scripts, or fail.** There is no manual mode. Never read the rules and review the ticket yourself: a review written without the scripts is not a SliceCheck review, even if it looks right. The only two valid outcomes are:
1. the review the `verify` script prints, shown exactly, or
2. this one line, when the scripts can't run or the review can't pass verification: `⚠️ SliceCheck couldn't run here, so this ticket wasn't reviewed.` followed by one short reason (for example "no code tool available").

## Get the engine

Use whichever you have. Nothing needs installing.

- **Python 3** (most AI code tools): you need `python/slicecheck.py` and `python/rules.json` saved side by side. If you're reading this repo through GitHub or the web, load both files into your code tool and save them.
- **Node 18+:** `skills/slicecheck/scripts/slicecheck.mjs` (with `skills/slicecheck/rules.yaml`).

Commands below use Python. With Node, swap `python3 python/slicecheck.py` for `node skills/slicecheck/scripts/slicecheck.mjs`.

If the user's project has its own `slicecheck.rules.json` (Python) or `slicecheck.rules.yaml` (Node), the scripts use it automatically.

## Steps

1. **Save the ticket** to `ticket.txt` exactly as the user wrote it. Don't fix or summarize it.

2. **Get your instructions:**
   ```
   python3 python/slicecheck.py prompt ticket.txt
   ```
   It prints the code findings (final, copy them as-is), the judgment rules for you to check, what you must never flag, and the exact format.

3. **Write the review** in that format to `review.txt`. Add a judgment finding only when a rule is clearly broken.

4. **Verify:**
   ```
   python3 python/slicecheck.py verify ticket.txt review.txt
   ```
   - **PASS:** it prints the final review. Go to step 5.
   - **FAIL:** fix every listed problem, then verify again. If it still fails after 3 tries, stop and show only the failure line from **The one rule**, with the first problem it listed as the reason.

5. **Show the user exactly the review that verify printed.** Nothing before or after it. Don't mention the scripts, the steps or the verification; it runs silently.

6. Delete `ticket.txt` and `review.txt`.

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need"), copy the default rules to `slicecheck.rules.json` (Python) or `slicecheck.rules.yaml` (Node) in their project, edit that copy, and tell them which rule ID changed. Never edit the defaults for one team's preferences.

## Never

- Never write a review yourself. No scripts, no review.
- Never invent rules, or findings that no rule covers.
- Never store, repeat or share ticket content outside the review.
