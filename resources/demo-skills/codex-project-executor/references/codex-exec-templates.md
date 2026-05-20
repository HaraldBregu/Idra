# Codex Exec Command Templates

Source basis checked against OpenAI Codex docs on 2026-05-20:

- https://developers.openai.com/codex/noninteractive
- https://developers.openai.com/codex/cli/reference#codex-exec

## Default Project Run

Use for read-only project analysis or tasks that should not edit files.

```bash
codex exec --cd "$PROJECT" "$PROMPT"
```

## Edit-Capable Project Run

Use when the prompt explicitly requires code or file changes inside the project workspace.

```bash
codex exec --cd "$PROJECT" --sandbox workspace-write "$PROMPT"
```

## Ephemeral Triage

Use for throwaway analysis when session rollout files should not be persisted.

```bash
codex exec --cd "$PROJECT" --ephemeral "$PROMPT"
```

## CI-Friendly Output

Use when downstream tooling needs progress events and a final natural-language summary file.

```bash
codex exec --cd "$PROJECT" --json --output-last-message "$OUTPUT" "$PROMPT"
```

Use `--output-schema "$SCHEMA"` with `--output-last-message "$OUTPUT"` when the final response must match a JSON Schema.

```bash
codex exec --cd "$PROJECT" --json --output-schema "$SCHEMA" --output-last-message "$OUTPUT" "$PROMPT"
```

## Prompt From Stdin

Use when a file or script generates the entire prompt.

```bash
cat "$PROMPT_FILE" | codex exec --cd "$PROJECT" -
```

## Prompt Plus Piped Context

Use when another command produces logs or data and the quoted prompt is the instruction.

```bash
"$CONTEXT_COMMAND" | codex exec --cd "$PROJECT" "$PROMPT"
```

Replace `"$CONTEXT_COMMAND"` with a real command before running. Do not keep it as a literal placeholder.

## Resume Last Project Session

Use after a previous `codex exec` run when the follow-up should continue the most recent session for the project.

```bash
codex exec --cd "$PROJECT" resume --last "$FOLLOW_UP_PROMPT"
```

Add `--all` only when the most recent session may have started from a different directory.
