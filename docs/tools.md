# Tools

This document describes the current tools under `src/main/tools`, how they are used, and how they are loaded.

## Loading Overview

Friday has two tool systems.

The legacy tool system is defined by `src/main/tools/types.ts`. Legacy tools expose `schema`, run as `execute(args, ctx)`, and return `{ status, content, details }`. The default legacy registry is `ALL_TOOLS` in `src/main/tools/registry.ts`. `src/main/service.ts` loads it with `createTools({ profile: 'full', allow: [], deny: DEFAULT_LOCAL_TOOL_DENY })`, then appends connector-created tools from `dependencies.connectors?.createAgentTools()`.

The newer runtime tool system is defined by `src/main/tools/common.ts`. Newer tools expose `parameters`, run as `execute(toolCallId, params, signal, onUpdate)`, carry metadata such as `core`, `plugin`, `mcp`, `lsp`, or `client`, and return `{ content, details }`. `src/main/runtime/run-attempt.ts` calls `createAgentTools`, then `toToolDefinitions` adapts the result into model-facing definitions.

In the tables below:

- `Used?` describes whether the tool is loaded by the current default path.
- `Loaded by` names the code path that loads or materializes the tool.
- `Policy` summarizes the profile, group, approval, owner-only, sandbox, or read-only rule that controls exposure or execution.

## Default Legacy Tools

These tools are loaded through `ALL_TOOLS` and then filtered by `createTools`.

| Tool | Used? | Loaded by | Policy | How it is used |
| --- | --- | --- | --- | --- |
| `read` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; workspace scope can be restricted | Reads a UTF-8 file from an absolute or workspace-relative path. It returns line-numbered text, supports `offset` and `limit`, and records file metadata in `ctx.readState` so later write operations can enforce read-before-write. |
| `write` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; approval; denied by read-only policy | Writes UTF-8 content to `path`, creating parent directories. Existing files require a prior `read` in the same run and must not have changed on disk. |
| `edit` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; approval; denied by read-only policy | Performs exact string replacement in a UTF-8 file. The file must have been read first, and `old` must be unique unless `replaceAll` is true. |
| `apply_patch` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; approval; denied by read-only policy | Applies a unified diff to existing workspace files after affected files have been read. It rejects new-file patches, context conflicts, and files changed since the last read. |
| `delete` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; approval; denied by read-only policy | Deletes a file after it has been read in the current run. Directory deletion requires `recursive: true`, and root paths are guarded. |
| `copy` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; approval; denied by read-only policy | Copies one file to another path and creates parent directories. Existing destinations require `overwrite: true` and a prior read snapshot of the destination. |
| `move` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; approval; denied by read-only policy | Moves or renames one file. The source must have been read earlier, and overwriting a destination requires `overwrite: true` plus a prior read snapshot. |
| `inspect_file` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; workspace scope can be restricted | Inspects any file as bytes. It returns size, MIME type, hash when practical, hex/text previews, and direct image content for supported image files. |
| `find` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; workspace scope can be restricted | Finds files and directories by glob pattern under the workspace or a supplied directory. It excludes `node_modules` and `.git`, supports `limit`, and returns relative paths. |
| `exec` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; approval; command deny patterns | Runs a shell command in the workspace or supplied working directory. It supports `timeoutMs`, extra `env`, and `background`; output is capped. For Python scripts, use `python3` unless the project specifies another command. |
| `process` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full` | Lists, reads logs for, or kills background processes started by `exec` with `background: true`. |
| `startup_files` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `full`; write/bootstrap approval | Lists, reads, writes, or completes bootstrap for allowlisted agent startup files under `.friday/agent/workspaces/<agentId>`. |
| `web_fetch` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; HTTP(S) only | Fetches an HTTP or HTTPS URL and returns readable text capped at 1 MB. HTML responses are stripped to text. |
| `cron` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `coding`, `standard`, `full`; owner-only; mutating actions require approval | Schedules and manages jobs through the Gateway-owned scheduler. It supports status, list, get, add, update, remove, run, runs, and wake actions. |
| `open_browser` | Yes | `ALL_TOOLS` -> `createTools` -> `AgentService` | `full`; HTTP(S) only | Opens an HTTP or HTTPS URL in the user's default browser through Electron `shell.openExternal`. |
| `browser` | Yes | Imported from `src/main/browser`, then included in `ALL_TOOLS` | `full` | Controls the managed browser service with actions such as status, start, stop, tabs, open, navigate, snapshot, screenshot, and act. |

## Defined But Not Loaded By Default

These legacy tools exist under `src/main/tools`, but they are not in `ALL_TOOLS`. They are only loaded if another caller imports them and supplies them through a custom tool factory or registry.

| Tool | Used? | Loaded by | Policy | How it is used |
| --- | --- | --- | --- | --- |
| `cron_add` | No by default | Direct import only | Approval | Legacy helper for scheduling a recurring cron job from an expression, typed task data, optional id, and timezone. |
| `cron_list` | No by default | Direct import only | None in tool body | Legacy helper that lists scheduled cron jobs from `ctx.services.cron`. |
| `cron_remove` | No by default | Direct import only | Approval | Legacy helper that removes a scheduled cron job by `job_id` and errors when the id does not exist. |
| `get_workspace_content` | No by default | Direct import only | None in tool body | Lists files and folders under the workspace with bounded depth and result count. |
| `get_workspace_path` | No by default | Direct import only | None in tool body | Returns the absolute workspace root from `ctx.services.workspace`. |
| `get_provider_by_id` | No by default | Direct import only | None in tool body | Reads a stored provider by id from `ctx.services.store`. |
| `set_provider_api_key` | No by default | Direct import only | Approval | Stores an API key for supported provider ids, currently `openai` and `anthropic`. |
| `get_agent_service` | No by default | Direct import only | None in tool body | Reads the configured agent service, including provider and model, from the store. |
| `get_agent_model` | No by default | Direct import only | None in tool body | Reads the currently configured agent model from the store. |
| `set_agent_service` | No by default | Direct import only | Approval | Sets the agent service by provider id, model id, and model name. |
| `update_plan` | No by default | Direct import only | None in tool body | Replaces `ctx.plan.entries` with entries using `pending`, `in_progress`, or `done`. |

## New Runtime Built-Ins

These tools are constructed by `createAgentTools` for run-attempt based execution, not by the legacy `ALL_TOOLS` registry.

| Tool | Used? | Loaded by | Policy | How it is used |
| --- | --- | --- | --- | --- |
| `read` | Yes in new runtime | `createAgentTools` when file tools are included | `group:file`, `coding`, `full`; workspace scope can be restricted | Reads a workspace file as UTF-8 and returns line-numbered text. It supports `offset` and `limit`, and returns details such as absolute path, size, and truncation. |
| `exec` | Yes in new runtime | `createAgentTools` when shell tools are included | `group:shell`, `coding`, `full`; hidden when sandbox disallows shell | Runs a shell command with timeout, output cap, abort-signal support, stdout/stderr progress updates, and dangerous-command deny patterns. |
| `update_plan` | Yes in new runtime | `createAgentTools` when session or planning tools are included | `group:planning`, `group:session`, `minimal`, `coding`, `full` | Updates the current task plan with `pending`, `in_progress`, or `completed` steps and calls the optional `onUpdatePlan` callback. |

When `toolsAllow` is omitted, `createAgentTools` includes file, shell, session, plugin, and tool-search control families by default. When `toolsAllow` is provided, `planToolConstruction` loads only the requested tool families or specific tool names.

## Dynamic Runtime Tools

These tools are materialized at runtime and depend on configured runtimes or caller-provided tools.

| Tool family | Used? | Loaded by | Policy | How it is used |
| --- | --- | --- | --- | --- |
| Plugin tools | Runtime-dependent | `pluginRegistry.resolveTools` inside `createAgentTools` | `group:plugins`, `plugin:<id>`, `full`, or explicit allow | Contributes tools from enabled plugins. Tools are marked with plugin metadata and then pass through the shared policy, schema normalization, and before-call wrapper pipeline. |
| MCP tools | Runtime-dependent | `materializeMcpTools` when MCP tools are included and `mcpRuntime` exists | `group:mcp`, `mcp_*`, `full`, or explicit allow | Lists MCP descriptors, creates provider-safe names like `mcp_<server>_<tool>`, and delegates execution to `runtime.callTool(serverId, toolName, params, signal)`. |
| LSP tools | Runtime-dependent | `materializeLspTools` when LSP tools are included and `lspRuntime` exists | `group:lsp`, `lsp_*`, `full`, or explicit allow | Creates `lsp_hover`, `lsp_definition`, and `lsp_references` when the LSP runtime advertises those capabilities. Each accepts `path`, zero-based `line`, and zero-based `character`. |
| Client-hosted tools | Runtime-dependent | `clientTools` passed to `createAgentTools` | `group:client`, `full`, or explicit allow | Marks caller-supplied tools as client-hosted. `toToolDefinitions` delegates execution to the client instead of running them in the main process. |
| Connector tools | Runtime-dependent | `dependencies.connectors?.createAgentTools()` in `AgentService` | Connector-specific approval rules | Adds configured connector tools to the legacy service tool list after `createTools`, for example Gmail or Google Calendar connector actions. |

## Tool Search Controls

When tool-search compaction is enabled and the effective tool list exceeds the threshold, `applyToolSearchCompaction` hides cataloged tools behind these controls.

| Tool | Used? | Loaded by | Policy | How it is used |
| --- | --- | --- | --- | --- |
| `tool_search` | Conditional | `applyToolSearchCompaction` | Created when compaction is enabled or tool-search controls are explicitly allowed | Searches hidden tools by keyword and returns matching names, labels, and descriptions. |
| `tool_describe` | Conditional | `applyToolSearchCompaction` | Created when compaction is enabled or tool-search controls are explicitly allowed | Returns full schema and metadata for one hidden catalog tool by name. |
| `tool_call` | Conditional | `applyToolSearchCompaction` | Created when compaction is enabled or tool-search controls are explicitly allowed | Executes a hidden catalog tool by name with `args`, forwarding through the same wrapped execution path. |

## Policy And Execution Pipeline

Legacy tools are filtered by `src/main/tools/policy.ts`. The `coding` and `standard` profiles include file tools, shell tools, `web_fetch`, and `cron`. The `full` profile includes all tools in `ALL_TOOLS` unless `deny` removes them. `allow` further restricts the final set when it is non-empty.

New runtime tools use `src/main/tools/tool-policy.ts` and `src/main/tools/tool-policy-pipeline.ts`. Policies support profiles, explicit allow/deny lists, globs, plugin ids, and named groups such as `group:file`, `group:shell`, `group:web`, `group:planning`, `group:mcp`, and `group:lsp`. Owner-only tools are hidden from non-owner senders before staged policy filters run.

Both tool systems have before-call handling. Legacy tools use `before-call.ts` for loop detection and legacy approval caching. New runtime tools use `before-tool-call.ts` for argument preparation, loop detection, optional hooks, approval requests, diagnostics events, and input/error normalization.

## Tool Management Framework

The `src/main/tools/management` directory is a framework for ranking, selecting, planning, executing, auditing, validating, caching, and adapting tools. It is not loaded by the default `ALL_TOOLS` registry.

Important pieces:

| Module | Loaded by | How it is used |
| --- | --- | --- |
| `types.ts` | Imported by management modules | Defines managed `Tool`, `ToolResult`, safety levels, privacy levels, categories, plans, selection decisions, and execution context. |
| `adapter.ts` | Direct import only | Converts legacy `AgentTool` values into managed `Tool` values and infers category, permissions, safety, latency, reliability, tags, and privacy. |
| `registry.ts` | Direct import only | Creates an in-memory registry for enabled managed tools. |
| `executor.ts` | Direct import only | Executes managed tools with input schema validation, rate limits, per-turn limits, timeout handling, retries, output validation, and audit logging. |
| `selector.ts`, `ranker.ts`, `planner.ts` | Direct import only | Select, rank, and plan tool use based on user intent, available tools, and memory. |
| `audit-log.ts`, `output-validator.ts`, `schema.ts` | Direct import only | Redact sensitive input, summarize output, validate schemas, and validate result freshness/provenance. |
| `examples.ts` | `createExampleTools()` only | Provides example managed tools such as calculator, weather, web search, email draft, calendar event creation, file search, and memory search. These are examples, not default agent tools. |
