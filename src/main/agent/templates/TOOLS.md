# Tools

This document describes the local tools implemented under
`src/main/tools/base`. Tools outside that directory are intentionally omitted.

## Current Base Tools

| Source file | Exposed tool | How it is used |
| --- | --- | --- |
| `edit.ts` | `edit` | Applies targeted text replacements to an existing UTF-8 file. The file must have been read earlier in the run, and unchanged files are guarded by the read snapshot. |
| `exec.ts` | `exec` | Runs a shell command in the workspace with approval gating, denied-pattern checks, optional background mode, and capped foreground output. |
| `find.ts` | `find` | Finds files by glob pattern from the workspace or a provided search directory, excluding `node_modules` and `.git` paths. |
| `read.ts` | `read` | Reads a UTF-8 file and returns content with 1-indexed line-number prefixes. The default cap is 2000 lines. |
| `write.ts` | `write` | Creates or overwrites a UTF-8 file. Existing files must have been read earlier in the run, and parent directories are created as needed. |

## Runtime Bucket

The run-scoped base tools are assembled through `createFileTools`:

- `createFileTools` includes `read`, `edit`, `find`, `exec`, and `write`.

Each tool is wrapped through the canonical runtime bridge before provider schema
normalization and policy filtering.

## Safety Rules

The base tools rely on shared workspace and execution guards:

- `read`, `write`, `edit`, and `find` resolve absolute or workspace-relative
  paths through the shared path resolver.
- `write` and `edit` enforce read-before-write checks for existing files.
- `exec` requires approval and blocks denied command patterns before execution.
- `exec` caps foreground command output and supports background process startup.
