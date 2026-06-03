# Tools

This document describes the local tools implemented under
`src/main/tools/base`. Tools outside that directory are intentionally omitted.

## Base Tool Files

| Source file | Exposed tool | How it is used |
| --- | --- | --- |
| `delete.ts` | `file_delete` | Deletes a file by absolute or workspace-relative path. Directories require `recursive=true`. |
| `edit.ts` | `edit` | Applies targeted text replacements to an existing UTF-8 file. The file must have been read earlier in the run. |
| `exec.ts` | `exec` | Runs a shell command in the workspace with capped output, denied-pattern checks, optional background mode, and approval gating. |
| `find.ts` | `find` | Finds files by glob pattern from the workspace or a provided search directory, excluding common dependency and Git directories. |
| `read.ts` | `read` | Reads a UTF-8 file and returns content with 1-indexed line-number prefixes. |
| `run_script.ts` | `run_script` | Runs an existing script file with explicit string arguments, interpreter selection, timeout, and output limits. It does not run arbitrary shell command text. |
| `write.ts` | `write` | Creates or overwrites a UTF-8 file. Existing files must have been read earlier in the run. Parent directories are created as needed. |

## Runtime Bucket

The run-scoped base tools are assembled through `createFileTools` and
`createScriptTools`:

- `createFileTools` includes `read`, `edit`, `find`, `exec`, `write`, and
  `file_delete`.
- `createScriptTools` includes `run_script`.

Each tool is wrapped through the canonical runtime bridge before provider schema
normalization and policy filtering.

## Safety Rules

The base tools rely on shared workspace and execution guards:

- `read`, `write`, `edit`, `file_delete`, and `find` resolve absolute or
  workspace-relative paths through the shared path resolver.
- `write` and `edit` enforce read-before-write checks for existing files.
- `exec` requires approval and blocks denied command patterns before execution.
- `exec` caps foreground command output and supports background process startup.
- `run_script` executes existing files only, passes arguments without shell
  interpolation, and caps stdout and stderr capture.

## Removed Base Tools

`list.ts` and `move.ts` are not part of `src/main/tools/base`.
