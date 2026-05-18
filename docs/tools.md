# Tools

This document describes the tools defined under `src/main/tools` and how they are used by Friday.

## Tool Assembly

Friday currently has two tool shapes.

The legacy shape is defined in `src/main/tools/types.ts`. These tools expose a `schema`, run as `execute(args, ctx)`, and return `{ status, content, details }`. `src/main/tools/registry.ts` builds the default legacy tool list with `ALL_TOOLS`, and `src/main/service.ts` uses `createTools({ profile: 'full', allow: [], deny: DEFAULT_LOCAL_TOOL_DENY })` for the default agent service.

The newer runtime shape is defined in `src/main/tools/common.ts`. These tools expose `parameters`, run as `execute(toolCallId, params, signal, onUpdate)`, carry metadata through `markCoreTool`, `markPluginTool`, `markMcpTool`, `markLspTool`, or `markClientTool`, and return `{ content, details }`. `src/main/tools/create-agent-tools.ts` assembles these tools for run attempts, then applies policy, schema normalization, before-call wrapping, and optional tool-search compaction.

`src/main/tools/tool-definition-adapter.ts` adapts the newer runtime shape into model-facing tool definitions. Client-hosted tools are not executed in the main process; the adapter returns a pending result and terminates so the client can execute them.

In the tables below, `Used?` describes current exposure: `Yes` means the tool is in the default legacy registry, `Yes in new runtime` means it is assembled by `createAgentTools` when that family is enabled, `No by default` means it is defined but not currently in `ALL_TOOLS`, and `Runtime-dependent` or `Conditional` means availability depends on runtime configuration.

## Default Legacy Tools

These tools are in `ALL_TOOLS` in `src/main/tools/registry.ts`.

| Tool | Used? | Source | How it is used |
| --- | --- | --- | --- |
| `read` | Yes | `src/main/tools/fs.ts` | Reads a UTF-8 file from an absolute or workspace-relative path. It returns line-numbered text, supports `offset` and `limit`, and records file metadata in `ctx.readState` so later writes can enforce read-before-write. |
| `write` | Yes | `src/main/tools/fs.ts` | Writes UTF-8 content to `path`, creating parent directories. Existing files require a prior `read` in the same run and must not have changed on disk. Disabled when `ctx.fsPolicy.readOnly` is set. |
| `edit` | Yes | `src/main/tools/fs.ts` | Performs exact string replacement in a UTF-8 file. The file must have been read first, and `old` must be unique unless `replaceAll` is true. Disabled by read-only filesystem policy. |
| `apply_patch` | Yes | `src/main/tools/fs.ts` | Applies a unified diff to existing workspace files after those files have been read. It rejects new-file patches, context conflicts, read-only policy, and files changed since the last read. |
| `delete` | Yes | `src/main/tools/fs.ts` | Deletes a file after it has been read in the current run. Directories require `recursive: true`, root paths are guarded, and read-only filesystem policy disables deletion. |
| `copy` | Yes | `src/main/tools/fs.ts` | Copies one file to another path and creates parent directories. Existing destinations require `overwrite: true` and a prior read snapshot of the destination. |
| `move` | Yes | `src/main/tools/fs.ts` | Moves or renames one file. The source must have been read earlier, and overwriting a destination requires `overwrite: true` plus a prior read snapshot of the destination. |
| `inspect_file` | Yes | `src/main/tools/fs.ts` | Inspects any file as bytes, returning size, MIME type, hash when practical, hex/text previews, and direct image content for supported image files. |
| `find` | Yes | `src/main/tools/fs.ts` | Finds files and directories by glob pattern under the workspace or a supplied directory. It excludes `node_modules` and `.git`, supports `limit`, and returns relative paths. |
| `exec` | Yes | `src/main/tools/exec.ts` | Runs a shell command in the workspace or supplied working directory. It supports `timeoutMs`, extra `env`, and `background`. Output is capped, and dangerous command patterns are denied. |
| `process` | Yes | `src/main/tools/exec.ts` | Lists, reads logs for, or kills background processes that were started by `exec` with `background: true`. |
| `startup_files` | Yes | `src/main/tools/startup.ts` | Lists, reads, writes, or completes bootstrap for allowlisted agent startup files under `.friday/agent/workspaces/<agentId>`. Write and bootstrap completion are approval-marked. |
| `web_fetch` | Yes | `src/main/tools/web.ts` | Fetches an HTTP or HTTPS URL and returns readable text capped at 1 MB. HTML responses are stripped to text. Non-HTTP protocols are rejected. |
| `cron` | Yes | `src/main/tools/cron.ts` | Schedules and manages jobs through the Gateway-owned scheduler. It supports status, list, get, add, update, remove, run, runs, and wake actions. Mutating actions are approval-marked. |
| `open_browser` | Yes | `src/main/tools/app.ts` | Opens an HTTP or HTTPS URL in the user's default browser through Electron `shell.openExternal`. |
| `browser` | Yes | `src/main/browser/tool.ts` | Imported into the registry from outside `src/main/tools`. It controls the managed browser service with actions such as status, start, stop, tabs, open, navigate, snapshot, screenshot, and act. |

## Other Legacy Tool Definitions

These tools are defined under `src/main/tools` but are not currently included in `ALL_TOOLS` unless another caller imports and exposes them.

| Tool | Used? | Source | How it is used |
| --- | --- | --- | --- |
| `cron_add` | No by default | `src/main/tools/cron.ts` | Legacy helper for scheduling a recurring cron job from an expression, typed task data, optional id, and timezone. It is approval-marked. |
| `cron_list` | No by default | `src/main/tools/cron.ts` | Legacy helper that lists scheduled cron jobs from `ctx.services.cron`. |
| `cron_remove` | No by default | `src/main/tools/cron.ts` | Legacy helper that removes a scheduled cron job by `job_id`. It is approval-marked and errors when the id does not exist. |
| `set_theme_mode` | No by default | `src/main/tools/app.ts` | Sets Electron `nativeTheme.themeSource` to `light`, `dark`, or `system`, then emits `theme:changed`. |
| `open_app_data_folder` | No by default | `src/main/tools/app.ts` | Opens Electron's `userData` folder in the OS file manager. |
| `open_user_data_folder` | No by default | `src/main/tools/app.ts` | Ensures and opens Friday's user-owned `.friday` data folder. |
| `open_folder` | No by default | `src/main/tools/app.ts` | Opens a folder inside the current workspace. It resolves real paths and rejects files, missing folders, and paths outside the workspace. |
| `open_accessibility_settings` | No by default | `src/main/tools/app.ts` | Opens macOS Accessibility privacy settings. It returns an error on non-macOS platforms. |
| `open_screen_recording_settings` | No by default | `src/main/tools/app.ts` | Opens macOS Screen Recording privacy settings. It returns an error on non-macOS platforms. |
| `set_menu_bar` | No by default | `src/main/tools/app.ts` | Emits `tray:set-enabled` to show or hide the menu bar icon. |
| `get_workspace_content` | No by default | `src/main/tools/workspace.ts` | Lists files and folders under the workspace with bounded depth and result count. |
| `get_workspace_path` | No by default | `src/main/tools/workspace.ts` | Returns the absolute workspace root from `ctx.services.workspace`. |
| `get_provider_by_id` | No by default | `src/main/tools/providers.ts` | Reads a stored provider by id from `ctx.services.store`. |
| `set_provider_api_key` | No by default | `src/main/tools/providers.ts` | Stores an API key for supported provider ids, currently `openai` and `anthropic`. It is approval-marked. |
| `get_agent_service` | No by default | `src/main/tools/services.ts` | Reads the configured agent service, including provider and model, from the store. |
| `get_agent_model` | No by default | `src/main/tools/services.ts` | Reads the currently configured agent model from the store. |
| `set_agent_service` | No by default | `src/main/tools/services.ts` | Sets the agent service by provider id, model id, and model name. It is approval-marked and fails when the provider id is unknown. |
| `update_plan` | No by default | `src/main/tools/plan.ts` | Legacy planner tool that replaces `ctx.plan.entries` with entries using `pending`, `in_progress`, or `done`. |
| `sessions_list` | No by default | `src/main/tools/sessions.ts` | Lists visible sessions with optional search, status, label, and last-message metadata. Visibility is controlled by `ctx.sessionVisibility`. |
| `sessions_history` | No by default | `src/main/tools/sessions.ts` | Reads bounded, sanitized transcript history for the current or another visible session. |
| `sessions_send` | No by default | `src/main/tools/sessions.ts` | Appends a user message to another visible session and marks it waiting. This runtime records the message but does not start a model run. |
| `sessions_spawn` | No by default | `src/main/tools/sessions.ts` | Creates a controlled child session with inherited workspace and session constraints. It records the task as the first user transcript entry when provided. |
| `sessions_yield` | No by default | `src/main/tools/sessions.ts` | Reports that the current turn can yield while waiting for a visible session. The current runtime returns a note that host turn-yield scheduling is unavailable. |
| `subagents` | No by default | `src/main/tools/sessions.ts` | Lists, cancels, or steers controlled child sessions spawned by the current session. |
| `session_status` | No by default | `src/main/tools/sessions.ts` | Reads or updates status, task, and model override for the current or another visible session. |
| `memory_search` | No by default | `src/main/tools/memory.ts` | Searches durable workspace memory and visible session transcripts. It supports `memory`, `sessions`, and `all` corpora; `wiki` returns unavailable in this runtime. |
| `memory_get` | No by default | `src/main/tools/memory.ts` | Reads a bounded range from configured memory Markdown files after a search result identifies a useful path. |

## New Runtime Built-Ins

These tools are created by `src/main/tools/create-agent-tools.ts` for the newer runtime path.

| Tool | Used? | Source | How it is used |
| --- | --- | --- | --- |
| `read` | Yes in new runtime | `src/main/tools/builtins/read-tool.ts` | Reads a workspace file as UTF-8 and returns line-numbered text. It supports `offset` and `limit`, enforces workspace-only access unless absolute paths are explicitly allowed, and returns file details such as size and truncation. |
| `exec` | Yes in new runtime | `src/main/tools/builtins/exec-tool.ts` | Runs a shell command with timeout, output cap, abort-signal support, stdout/stderr progress updates, and dangerous-command deny patterns. The `background` parameter is accepted but reserved. |
| `update_plan` | Yes in new runtime | `src/main/tools/builtins/update-plan-tool.ts` | Updates the current task plan with `pending`, `in_progress`, or `completed` steps. It calls the optional `onUpdatePlan` callback and returns the updated plan in details. |

`createAgentTools` includes these built-ins based on `toolsAllow` and the computed construction plan. It can also filter shell tools when `sandbox.allowShell === false`, apply read-only filesystem policy, normalize schemas for the selected provider, wrap tools with before-call checks, and compact large tool sets behind `tool_search`.

## Dynamic Runtime Tools

These tools are materialized at runtime rather than hard-coded in `ALL_TOOLS`.

| Tool family | Used? | Source | How it is used |
| --- | --- | --- | --- |
| Plugin tools | Runtime-dependent | `src/main/tools/create-agent-tools.ts` | When plugin tools are enabled and a `pluginRegistry` is present, `pluginRegistry.resolveTools` contributes tools. They are marked with plugin metadata and can be selected by policy entries such as `group:plugins` or `plugin:<id>`. |
| MCP tools | Runtime-dependent | `src/main/tools/external/mcp-tools.ts` | `materializeMcpTools` asks the MCP runtime for descriptors, creates safe provider tool names like `mcp_<server>_<tool>`, and delegates execution to `runtime.callTool(serverId, toolName, params, signal)`. |
| LSP tools | Runtime-dependent | `src/main/tools/external/lsp-tools.ts` | `materializeLspTools` creates `lsp_hover`, `lsp_definition`, and `lsp_references` when the LSP runtime advertises matching capabilities. Each accepts `path`, zero-based `line`, and zero-based `character`. |
| Client-hosted tools | Runtime-dependent | `src/main/tools/create-agent-tools.ts` | Caller-supplied `clientTools` are marked as client tools. The model-facing adapter delegates their execution to the client instead of executing them in the main process. |

## Tool Search Controls

When tool-search compaction is enabled and the effective tool list exceeds the threshold, `src/main/tools/tool-search.ts` hides cataloged tools behind three controls.

| Tool | Used? | How it is used |
| --- | --- | --- |
| `tool_search` | Conditional | Searches hidden tools by keyword and returns matching names, labels, and descriptions. |
| `tool_describe` | Conditional | Returns full schema and metadata for one hidden catalog tool by name. |
| `tool_call` | Conditional | Executes a hidden catalog tool by name with `args`, forwarding through the same wrapped execution path. |

## Policy, Safety, And Results

Policy is handled in two places.

`src/main/tools/policy.ts` filters legacy `ALL_TOOLS` by profile, allow, alsoAllow, and deny lists. The `coding` and `standard` profiles include file, shell, web, and cron tools; `full` includes all tools after deny filtering.

`src/main/tools/tool-policy.ts` and `src/main/tools/tool-policy-pipeline.ts` handle the newer runtime. They support profiles, named groups such as `group:file`, `group:shell`, `group:web`, `group:planning`, `group:mcp`, and `group:lsp`, plugin ids, globs, owner-only filtering, sandbox policy, and runtime allow/deny lists.

Before-call behavior is also split by tool shape.

`src/main/tools/before-call.ts` is the legacy preflight. It tracks repeated identical calls, warns after three calls, stops after five, and records approval requirements in `ctx.approvalCache`.

`src/main/tools/before-tool-call.ts` wraps newer runtime tools. It runs argument preparation, loop detection, optional hooks, approval requests, diagnostics events, input-error normalization, and generic error normalization.

Result helpers live in `src/main/tools/results.ts` for the newer runtime and `textResult` in `src/main/tools/types.ts` for legacy tools. The newer helpers produce text, JSON, image, blocked, and error results with structured details.

Schema and parameter helpers live in `src/main/tools/schema-normalization.ts` and `src/main/tools/params.ts`. They remove provider-unsupported JSON Schema keywords, coerce JSON object parameters, and validate strings, numbers, booleans, arrays, and enums.

## Tool Management Framework

The `src/main/tools/management` directory is a framework for ranking, selecting, planning, executing, auditing, validating, caching, and adapting tools. It is not the default `ALL_TOOLS` registry.

Important pieces:

| Module | How it is used |
| --- | --- |
| `types.ts` | Defines managed `Tool`, `ToolResult`, safety levels, privacy levels, categories, plans, selection decisions, and execution context. |
| `adapter.ts` | Converts legacy `AgentTool` values into managed `Tool` values and infers category, permissions, safety, latency, reliability, tags, and privacy. |
| `registry.ts` | Creates an in-memory registry for enabled managed tools. |
| `executor.ts` | Executes managed tools with input schema validation, rate limits, per-turn limits, timeout handling, retries, output validation, and audit logging. |
| `selector.ts`, `ranker.ts`, `planner.ts` | Select, rank, and plan tool use based on user intent, available tools, and memory. |
| `audit-log.ts`, `output-validator.ts`, `schema.ts` | Redact sensitive input, summarize output, validate schemas, and validate result freshness/provenance. |
| `examples.ts` | Provides example managed tools such as calculator, weather, web search, email draft, calendar event creation, file search, and memory search. These are examples for the management framework, not default agent tools. |
