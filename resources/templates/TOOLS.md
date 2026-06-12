# Tools

This document describes the local agent tools implemented under
`src/main/agent/tools`. Tools passed in through `RuntimeInput.tools` are
runtime-specific and are intentionally omitted.

## Current Agent Tools

| Source file | Exposed tool | How it is used |
| --- | --- | --- |
| `read.ts` | `read` | Reads the full UTF-8 contents of a single text file from a required `path`. Use it before editing when current file contents matter. |
| `edit.ts` | `edit` | Replaces one exact `oldText` match with required `newText` in a UTF-8 text file. Use it for focused edits when the old text appears exactly once. |
| `write.ts` | `write` | Creates or overwrites a UTF-8 text file with exact `content`, creating parent directories when needed. |
| `exec.ts` | `exec` | Runs a shell `command` from the workspace or provided `workdir` for builds, tests, searches, and command-line checks, with optional environment, yield/background mode, timeout, and PTY support. |

## Runtime Bucket

`AgentRuntime` starts with any tools provided through `RuntimeInput.tools`,
then appends the local file and command tools:

- `read`
- `edit`
- `write`
- `exec`

These tools are exposed to the provider through the `Tool` base class contract:
`name`, optional `description`, optional JSON schema, and `run(input)`.

## Safety Rules

The local tools rely on shared path resolution and per-tool validation:

- `read`, `write`, `edit`, and `exec.workdir` resolve paths through
  `resolveToolPath`.
- Relative paths resolve from the workspace path supplied to the runtime.
- `~` and `~/...` expand to the user home directory.
- Absolute paths are normalized and used as provided.
- `edit` rejects empty `oldText`, non-string `newText`, missing matches, and
  repeated matches.
- `write` rejects non-string content and creates parent directories before
  writing.
- `exec` rejects empty commands, invalid `workdir`, invalid environment values,
  invalid timing flags, and unavailable elevated, gateway, or node execution.
- `exec` captures up to 200000 characters each from stdout and stderr, records
  truncation flags, supports `timeout`, and returns background process metadata
  when `background` is true or `yieldMs` elapses.
