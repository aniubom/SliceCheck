# START HERE (for AI agents)

You are running **SliceCheck**: ticket peer review, minus the noise.
A user wants a ticket (user story, acceptance criteria, fields) peer reviewed. Follow this page exactly.

## The one rule

**If you can run code, you must run SliceCheck's scripts.** Do not read the rules and review the ticket yourself. A review you write without the scripts is not a SliceCheck review, even if it looks right. The scripts are what make SliceCheck consistent: they check the mechanical rules, hand you only the judgment calls, and verify your review before the user sees it.

You may review without the scripts only after you have **tried** to run them and they failed (no code tool, or the files can't be loaded). Then follow **No code** at the bottom.

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
   - **FAIL:** fix every listed problem, then verify again. If it still fails after 3 tries, show your last review and add one line at the end: `⚠️ Not verified: <the first problem it listed>`.

5. **Show the user exactly the review that verify printed.** Nothing before or after it. Don't mention the scripts, the steps or the verification; it runs silently.

6. Delete `ticket.txt` and `review.txt`.

## No code

Only if you tried to run the scripts and couldn't: follow the rules in `rules.yaml` yourself (every `must_fix` and `heads_up` rule, respecting `when` and the ticket's stage; never flag `ignore` rules; skip `off`). Use the same result format as a verified review:

**SliceCheck review**

🔴 **Must Fix**
- **MF-05 · Acceptance criteria:** the specific note

🟡 **Heads Up**
- **HU-01 · Estimate:** the specific note

✅ **Good:** sections with no findings

**Verdict:** 🔴 Needs attention before refinement: MF-05 *(or ✅ Clear to proceed when there's no Must Fix)*

Leave out an empty bucket, and end with one line: `⚠️ Not verified: SliceCheck's scripts couldn't run here.`

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need"), copy the default rules to `slicecheck.rules.json` (Python) or `slicecheck.rules.yaml` (Node) in their project, edit that copy, and tell them which rule ID changed. Never edit the defaults for one team's preferences.

## Never

- Never review without the scripts when you can run code.
- Never invent rules, or findings that no rule covers.
- Never store, repeat or share ticket content outside the review.
