# Claude Code CLI Command Templates

Source basis checked against `claude --help` output on 2026-05-20.

Key flag: `-p / --print` enables non-interactive mode (prints response and exits).
Working directory: set with a subshell `(cd "$PROJECT" && claude ...)` — there is no `--cd` flag.

---

## Inline prompt, read-only analysis

Default text output. Claude can read files but will prompt before editing or running shell commands.

```bash
(cd "$PROJECT" && claude -p "$PROMPT")
```

---

## Inline prompt, auto-accept edits (CI-friendly)

Skips approval prompts for file edits. Suitable for automated pipelines.

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --permission-mode dontAsk \
  --output-format text)
```

---

## Prompt from file

Use when the prompt lives in a Markdown or text file.

```bash
(cd "$PROJECT" && claude -p < "$PROMPT_FILE")
```

Or with explicit pipe:

```bash
cat "$PROMPT_FILE" | (cd "$PROJECT" && claude -p)
```

---

## Prompt as shell variable (multi-line safe)

Build the prompt in a variable and pass it via `printf` to avoid quoting issues with multi-line strings.

```bash
PROMPT=$(cat "$PROMPT_FILE")
printf '%s' "$PROMPT" | (cd "$PROJECT" && claude -p)
```

---

## JSON output (structured result)

Use when downstream tooling needs to parse Claude's response.

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --permission-mode dontAsk \
  --output-format json)
```

---

## Streaming JSON output

Use for real-time event processing (progress, tool calls, errors) in a pipeline.

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --permission-mode dontAsk \
  --output-format stream-json)
```

---

## With specific model

Override the default model when a specific capability tier is required.

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --model claude-opus-4-7 \
  --permission-mode dontAsk)
```

---

## With budget cap (cost-safe CI)

Abort if the run would exceed a dollar threshold.

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --permission-mode dontAsk \
  --max-budget-usd 0.50)
```

---

## Allow additional directories

Grant Claude tool access to a second directory (e.g. shared configs outside the project root).

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --add-dir "$SHARED_CONFIG_DIR" \
  --permission-mode dontAsk)
```

---

## Restrict tools (read-only enforcement)

Allow only Read and Grep — no shell execution, no file edits.

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --tools "Read,Grep" \
  --permission-mode dontAsk)
```

---

## With append system prompt

Inject project-specific instructions on top of Claude's defaults.

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --append-system-prompt "Always output a summary section at the end." \
  --permission-mode dontAsk)
```

---

## Bare mode (minimal, no CLAUDE.md discovery)

Use in sandboxed or CI environments where you want full control over context.

```bash
(cd "$PROJECT" && claude -p "$PROMPT" \
  --bare \
  --system-prompt "$(cat system-prompt.md)" \
  --permission-mode dontAsk)
```

---

## TypeScript SDK equivalent

```typescript
import { query } from "@anthropic-ai/claude-code";
import { readFileSync } from "fs";

const prompt = readFileSync(promptFilePath, "utf-8");

for await (const message of query({
  prompt,
  options: {
    cwd: projectPath,
    permissionMode: "dontAsk",
    outputFormat: "text",
  },
})) {
  if (message.type === "result") {
    console.log(message.result);
  }
}
```

---

## Python SDK equivalent

```python
import asyncio
from pathlib import Path
from claude_code_sdk import query, ClaudeCodeOptions

async def run(project_path: str, prompt_file: str) -> None:
    prompt = Path(prompt_file).read_text()
    options = ClaudeCodeOptions(
        cwd=project_path,
        permission_mode="dontAsk",
    )
    async for message in query(prompt=prompt, options=options):
        if message.type == "result":
            print(message.result)

asyncio.run(run("/path/to/project", "prompt.md"))
```
