# Claude Code Task Prompt Template

Use this template to write a well-scoped prompt before passing it to `claude -p`.
A focused prompt reduces token cost and improves result reliability.

---

Task:
<one concrete objective — verb + noun, e.g. "Fix the failing unit test in auth/login_test.go">

Scope:
<files, directories, or modules Claude should focus on; list explicitly>

Constraints:
- Make the smallest change that satisfies the task.
- Match existing project style and conventions.
- Do not refactor unrelated code.
- Do not add features that were not requested.

Verification:
<command to confirm success, e.g. "npm test" or "go test ./..." — or "report if verification cannot run">

Output:
- Summarize what was done.
- List any changed files.
- Include verification result or reason it was skipped.
