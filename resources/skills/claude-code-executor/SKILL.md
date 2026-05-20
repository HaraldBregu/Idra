---
name: claude-code-executor
description: Run Claude Code non-interactively from the shell against a local project path by passing a prompt inline, from a file, or via stdin. Covers CLI flags, permission modes, output formats, and the TypeScript/Python SDK equivalents.
license: MIT
compatibility: Requires Claude Code CLI (`claude`) installed and authenticated. SDK variants require `@anthropic-ai/claude-code` (TypeScript) or `claude-code-sdk` (Python).
metadata:
  author: friday-demo
  version: "1.0.0"
  domain: engineering
allowed-tools: Read Grep Bash(claude:*) Bash(cat:*) Bash(printf:*) Bash(cd:*)
user-invocable: true
---

# Claude Code Executor

Use this skill when the user wants to run Claude Code non-interactively against a local project from the shell, a script, or a CI pipeline — passing a project path and a prompt (inline text, a file path, or piped content).

## Workflow

1. Identify the `PROJECT_PATH` and the prompt source: inline string, a `.md`/`.txt` file, or piped content.
2. Confirm both are provided before running. Ask if either is missing.
3. Choose the smallest matching command from `references/cli-command-templates.md`.
4. Default to `--permission-mode dontAsk` for unattended runs and `--output-format text` unless the caller needs structured output.
5. Use a subshell `(cd "$PROJECT_PATH" && claude ...)` to set the working directory — Claude Code has no `--cd` flag.
6. After the run, report the command used, the output, and any changed files when write permissions were granted.

Use `assets/task-prompt-template.md` to draft a well-scoped prompt before executing.

## Input variants

| Source | Pattern |
|--------|---------|
| Inline prompt | `claude -p "do X"` inside the project subshell |
| Prompt from file | `claude -p < prompt.md` or `cat prompt.md \| claude -p` |
| Prompt as variable | `claude -p "$PROMPT"` where `$PROMPT` holds multi-line text |
| Structured prompt | Build with `printf` then pipe: `printf '%s' "$PROMPT" \| claude -p` |

## Permission modes

| Mode | When to use |
|------|-------------|
| `dontAsk` | Automated / CI runs where edits are pre-approved |
| `default` | Interactive-style approval prompts (default) |
| `acceptEdits` | Auto-accept file edits, still prompt for shell commands |
| `bypassPermissions` | Fully sandboxed disposable environments only |

Always prefer `dontAsk` over `bypassPermissions` for CI. Only use `bypassPermissions` in network-isolated sandboxes.

## Safety

- Do not pass secrets or API keys inline in the prompt string — use environment variables.
- Do not use `--dangerously-skip-permissions` unless the project runs in a disposable, network-isolated sandbox.
- If the run grants write access, inspect the diff before reporting success.
- Do not run against a path outside a Git repository unless `--add-dir` is explicitly needed and the user confirms.
