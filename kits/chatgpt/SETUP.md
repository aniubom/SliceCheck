# SliceCheck for ChatGPT (Custom GPT)

Build once, then just paste tickets. SliceCheck runs its checks using ChatGPT's code tool. Ticket content is processed by ChatGPT, not kept local to SliceCheck. How it is handled depends on your account, settings, and the policies that apply. Follow your organization's data-handling rules and only submit tickets you're authorized to share with ChatGPT.

You need: a ChatGPT plan that lets you create GPTs, and the three files in [`slicecheck-chatgpt-kit.zip`](https://github.com/aniubom/SliceCheck/releases/latest/download/slicecheck-chatgpt-kit.zip): `instructions.txt`, `slicecheck.py` and `rules.json`.

## Build it

1. In ChatGPT, open **GPTs**, then **Create**, then the **Configure** tab.
2. **Name:** SliceCheck
3. **Description:** Ticket peer review, minus the noise.
4. **Instructions:** paste everything in `instructions.txt`.
5. **Conversation starters:** "Peer review this ticket:" and "Show me the rules."
6. **Knowledge:** upload `slicecheck.py` and `rules.json`.
7. **Capabilities:** turn on **Code Interpreter & Data Analysis**. This is what lets it run the checks and verify its own review. Web search and image generation can stay off.
8. **Create**, and choose who can use it: just you, people in your workspace, or anyone with the link.

## Test it

Paste a sample ticket from the repo's `examples/` folder, for example `07-untestable-ac-typos-jira.md`. A correct result has Must Fix findings MF-05 and MF-06 and the verdict "🔴 Needs attention: MF-05, MF-06". Check `examples/expected.yaml` for every sample's expected result.

If the review ends with **"⚠️ Not verified: no code tool."**, SliceCheck used the manual fallback. Check that **Code Interpreter & Data Analysis** is on and both files are uploaded, then start a fresh preview and try again.

A **"⚠️ Not verified: <problem>"** warning can also mean verification still failed after the correction attempts. The review has not passed verification; address the reported problem before relying on it.

When testing the setup, inspect the code execution details: both the engine's `prompt` and `verify` commands must run, and `verify` must return PASS. The expected findings alone do not prove verification happened.

## Your team's rules

Edit `rules.json` (change a rule's `bucket`, add section names under `sections`), then replace the file in the GPT's Knowledge. Or ask SliceCheck for the change and it'll hand you an updated file.
