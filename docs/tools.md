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
  email, calendar, Drive, cron, and similar external or mutable tasks require
  tools.
- Creative writing, rewriting, translation, summarization, and brainstorming
  are answered without tools unless the request also needs external access.
- If no rule requires tools and no skill is selected, the run is a direct
  answer: startup context is not loaded for tool use, and the provider receives
  no tools.

The default `AgentService` path builds the local tool set from the full local
registry, denies `startup_files` by default, and adds enabled configured
connector tools. It can then add dynamic tools for bootstrap, heartbeat, and
skills.

There is also a run-scoped tool assembler for plugin, MCP, LSP, client-hosted,
and tool-search catalog workflows. That path is available in the codebase, but
it is separate from the default `AgentService` tool factory.

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

`cron_add`, `cron_list`, and `cron_remove` exist as legacy helper exports, but
they are not part of the current default local tool registry exposed by
`AgentService`.

## Dynamic Tools

These tools are added only when the corresponding runtime condition applies.

| Tool or family | When it appears |
| --- | --- |
| `startup_files` | Added only for pending primary bootstrap runs. During bootstrap, it is the only local tool exposed. |
| `heartbeat_respond` | Added for heartbeat runs when heartbeat tool reporting is enabled. |
| `execute_skill` | Added when skill discovery selects an executable skill that is not read from a file-backed location. |
| Connector tools | Added for enabled, configured connectors. Names are derived from the connector server label and raw tool name. |
| Plugin tools | Available through the run-scoped assembler when plugin tools are included by policy. |
| MCP tools | Available through the run-scoped assembler when MCP tools are explicitly included. |
| LSP tools | Available through the run-scoped assembler when an LSP runtime supplies capabilities. |
| Client tools | Available through the run-scoped assembler when the client provides hosted tool definitions. |
| `tool_search` | Searches hidden tools when run-scoped tool-search compaction is enabled. |
| `tool_describe` | Returns schema and metadata for a hidden tool when tool-search compaction is enabled. |
| `tool_call` | Executes a hidden tool through the same wrapped execution path when tool-search compaction is enabled. |

## Task Manager

The task manager described in [task-manager.md](task-manager.md) is currently
exposed through the app task APIs, not as an agent-facing local tool. There is no
`task` tool in the default registry or run-scoped assembler. If an agent tool is
added later, it should share the same main-process task manager and IPC contract
as `window.tasks`, return sanitized task records only, and keep handler
selection and validation privileged.

## Prompt Narrowing

The default service path narrows the candidate list for each turn.

- Explicit no-tool requests return no prompt tools.
- Tool inventory requests skip narrowing and expose all currently available
  tools.
- Bootstrap runs expose only `startup_files`.
- Otherwise, tool selection is forced and capped at 8 prompt tools by default.
- Discovery filters disabled tools, tools without required permissions, tools
  above the current safety level, and tools outside privacy constraints.
- Ranking scores tools by request term matches, inferred category, memory
  preferences, recent success, schema specificity, reliability, cost, latency,
  and safety.
- Google Calendar, Google Drive, and Gmail requests force matching connector
  tools into the prompt even when ranking would omit them.
- File mutation tools `write`, `edit`, `apply_patch`, `delete`, `copy`, and
  `move` automatically keep `read` available when it exists.
- Skill selection can force a skill's required or allowed tools into the prompt.
  File-backed skills also force `read` when needed.
- Heartbeat runs can force `heartbeat_respond` into the prompt.

The system prompt lists only the selected tools for the turn. When narrowing
selects ranked tools, a compact tool-card section is added with purpose,
when-to-use guidance, when-not-to-use guidance, required inputs, safety notes,
and an example call. The provider receives only each selected tool's name,
description, and JSON schema.

## Use

The model chooses whether to call one of the tools that were exposed for the
turn. The runtime does not force a tool call.

When a provider streams a tool call, the runtime collects the call id, tool name,
and JSON argument deltas. Invalid JSON is returned to the model as a tool error
and the tool is not executed. A call to a tool name that was not exposed for the
turn is also returned as a tool error.

Before execution, identical calls are tracked per turn. The third identical call
and later receive a warning. After more than 5 identical calls, execution is
vetoed and the model receives a loop-detector error. Legacy approval markers are
recorded for tools that require approval, but the current path does not pause the
agent loop for an approval prompt.

Execution then goes through the managed tool path.

- Arguments are extracted from the raw call, sanitized against the input schema,
  normalized, and validated.
- Unknown fields or missing required fields produce a clarification-style tool
  error instead of executing.
- Common values are normalized where supported, such as numeric strings, email
  casing, currency casing, units, and relative dates like `today` or `tomorrow`
  in the session timezone.
- Input schema validation runs before the tool executes.
- Per-tool rate limits and the per-turn tool-call limit are enforced.
- Tools run with an abort signal. Managed execution has a default timeout and
  transient failures can retry with backoff.
- Tool outputs are validated against the output schema.
- Prompt-injection-like tool output is treated as untrusted and normalized
  before it is returned to the model.
- Empty, partial, stale, contradictory, or otherwise suspicious output can add
  warnings.
- Tool calls are audited with sensitive values redacted.

Tool results are appended to the transcript as tool messages. The agent loop
then calls the provider again with the updated transcript. This repeats until the
provider stops calling tools, the run is cancelled, the context is compacted
after one overflow retry, or the max iteration limit is reached.

Tool lifecycle events are streamed to the renderer: call start, argument deltas,
parsed input, result, status, duration, and displayable output text. Run logs
record selected tool names, the tool-policy reason, phase durations, iterations,
and tool-call outcomes.
