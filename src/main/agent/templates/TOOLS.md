# Tools

This document describes how Friday currently assembles, selects, and executes
agent tools. Source file paths are intentionally omitted.

## Selection

The agent first evaluates the user message with a tool-use policy.

- If the user explicitly says not to use tools, no tools are exposed.
- Tool inventory questions expose the available tool surface so the model can
  answer from the current registry.
- URLs, current information, private account data, workspace files, codebase
  work, shell execution, tests, builds, debugging, mutation, browser actions,
  email, calendar, Drive, cron jobs, and similar external or mutable work
  require tools.
- Creative writing, rewriting, translation, summarization, and brainstorming
  are answered without tools unless the request also needs external access.
- If no rule requires tools and no skill is selected, the run is a direct
  answer: startup context is not loaded for tool use, and the provider receives
  no tools.

The default `AgentService` path builds the local tool set from the full local
registry, denies `startup_files` by default, and adds enabled configured
connector tools. It can then add dynamic tools for bootstrap, heartbeat, and
skills.

## Default Local Tools

These are the local tools in the default registry. A tool still has to pass
policy, ranking, and run context before it is exposed to the provider.

| Tool | How it is used |
| --- | --- |
| `read` | Reads a UTF-8 file and returns line-numbered text. Records read state for later guarded writes. |
| `write` | Creates or overwrites a UTF-8 file. Existing files must be read earlier in the run. |
| `edit` | Applies an exact string replacement to a UTF-8 file after the file has been read. |
| `apply_patch` | Applies a unified diff to existing workspace files after affected files have been read. |
| `delete` | Deletes a file after it has been read. Directory deletion requires `recursive=true` and root paths are guarded. |
| `copy` | Copies one file to another path. Overwriting requires prior read state for the destination. |
| `move` | Moves or renames one file. The source must be read first; overwriting requires prior destination read state. |
| `inspect_file` | Inspects bytes, size, MIME type, previews, hashes, and direct PNG/JPEG/GIF/WebP image content when practical. |
| `find` | Finds files by glob pattern, excluding common generated directories such as `node_modules` and `.git`. |
| `exec` | Runs a shell command in the workspace with capped output, denied dangerous command patterns, abort support, and an execution timeout. |
| `process` | Lists, reads logs for, or kills background processes started by `exec background=true`. |
| `web_fetch` | Fetches an HTTP or HTTPS URL and returns readable text capped at 1 MB. |
| `cron` | Schedules, lists, updates, removes, manually runs, inspects runs for, or wakes Gateway-owned cron jobs. |
| `open_browser` | Opens an HTTP or HTTPS URL in the user's default browser. |
| `browser` | Controls the managed browser: lifecycle, tabs, navigation, snapshots, screenshots, and element actions. |

## Dynamic Tools

These tools are added only when the corresponding runtime condition applies.

| Tool or family | When it appears |
| --- | --- |
| `startup_files` | Added only for pending primary bootstrap runs. During bootstrap, it is the only local tool exposed. |
| `heartbeat_respond` | Added for heartbeat runs when heartbeat tool reporting is enabled. |
| `execute_skill` | Added when skill discovery selects an executable skill that is not read from a file-backed location. |
| Connector tools | Added for enabled, configured connectors. Names are derived from the connector server label and raw tool name. |

## Use

The model chooses whether to call one of the tools that were exposed for the
turn. The runtime does not force a tool call.
