# Tools

This document describes the local agent tools implemented under
`src/main/agent/tools`. Tools passed in through `RuntimeInput.tools` are
runtime-specific and are intentionally omitted.

## Current Agent Tools

| Tool | How it is used |
| --- | --- |
| `read` | Reads the full UTF-8 contents of a single text file from a required `path`. Use it before editing when current file contents matter. |
| `write` | Creates or overwrites a UTF-8 text file with exact `content`, creating parent directories when needed. |
| `edit` | Replaces one exact `oldText` match with required `newText` in a UTF-8 text file. Use it for focused edits when the old text appears exactly once. |
| `exec` | Runs a shell `command` from the workspace or provided `workdir` for builds, tests, searches, and command-line checks, with optional environment, yield/background mode, timeout, and PTY support. |
| `process` | Manages exec sessions already started: `list`, `poll`, `log`, `write`, `send-keys`, `submit`, `paste`, `kill`, `clear`, and `remove` by `sessionId`. |

## Runtime Bucket

`AgentRuntime` starts with any tools provided through `RuntimeInput.tools`,
then appends the local tools loaded by `ToolLoader` in this order:

- `read`
- `write`
- `edit`
- `exec`
- `process`

These tools are exposed to the provider through the `Tool` base class contract:
`name`, optional `description`, optional JSON schema, and `run(input)`.

## Safety Rules

The local tools rely on per-tool path resolution and validation:

- `read`, `write`, `edit`, and `exec.workdir` resolve paths through a shared
  `resolvePath` helper.
- `~` and `~/...` (and the `~\\...` Windows form) expand to the user home
  directory.
- Other paths are normalized with `path.resolve`; absolute paths are used as
  provided.
- `read` rejects empty paths.
- `edit` rejects empty paths, empty `oldText`, non-string `newText`, missing
  matches, and repeated matches.
- `write` rejects empty paths and non-string content, and creates parent
  directories before writing.
- `exec` rejects empty commands, invalid `workdir`, invalid environment values,
  invalid timing flags, and unavailable elevated, gateway, or node execution.
- `exec` captures up to 200000 characters each from stdout and stderr, records
  truncation flags, supports `timeout`, and returns background process metadata
  when `background` is true or `yieldMs` (default 10000) elapses.
- When a foreground `exec` is backgrounded on `yieldMs`, it is registered as a
  trackable `process` session whose stdout/stderr buffers are capped at the last
  500000 characters.
- `process` rejects unknown actions, requires a `sessionId` for every action
  except `list`, and rejects calls that target a missing session or unavailable
  stdin.
