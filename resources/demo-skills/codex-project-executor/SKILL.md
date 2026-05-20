---
name: codex-project-executor
description: Run OpenAI Codex CLI non-interactive tasks against a local project path using common codex exec templates for analysis, edits, CI output, stdin prompts, and resumed sessions.
license: MIT
compatibility: Requires the Codex CLI, Codex authentication, and access to the target project. Write-capable runs require an appropriate sandbox setting.
metadata:
  author: friday-demo
  version: "1.0.0"
  domain: engineering
allowed-tools: Read Grep Bash(codex:*) Bash(test:*) Bash(printf:*) Bash(cat:*)
user-invocable: true
---

# Codex Project Executor

Use this skill when the user wants to run, script, or document a Codex CLI task for a specific local project.

## Workflow

1. Identify the target `PROJECT`, task `PROMPT`, and intended mode: read-only analysis, edit-capable work, CI output capture, stdin prompt, or resume.
2. Confirm missing or ambiguous project paths before running anything.
3. Choose the smallest matching command from `references/codex-exec-templates.md`.
4. Prefer read-only runs for investigation. Use `--sandbox workspace-write` only when Codex must edit files.
5. Use `--cd "$PROJECT"` or `-C "$PROJECT"` to set the workspace root instead of relying on the caller's current directory.
6. Keep prompts narrow: state the objective, constraints, verification command, and expected output.
7. After the run, report the command pattern used, whether it completed, any changed files, and where output was written.

Use `assets/project-prompt-template.md` when the user asks for a reusable prompt body.

## Safety

- Do not use `--dangerously-bypass-approvals-and-sandbox` unless the user explicitly asks and the project is running in an isolated disposable environment.
- Do not add `--skip-git-repo-check` unless the user confirms the directory is intentionally outside Git.
- Do not pass secrets in prompts. Prefer environment variables or existing Codex authentication.
- If a command changes the worktree, inspect and summarize the diff before reporting success.
