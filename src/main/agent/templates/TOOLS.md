# Tools

This document describes how Friday currently assembles, selects, and executes
agent tools. The source of truth is the local tool registry and runtime helpers
under `src/main/tools`, with shared tool metadata under `src/shared/tools`.

## Assembly

The default `AgentService` tool factory calls `ToolService.createDefaultTools`.
That factory builds tools from `LOCAL_TOOL_CATALOG`, applies the agent tool
profile, then applies runtime allow and deny lists.

- The default profile is `full`, which allows every tool in the local catalog.
- The `coding` and `standard` profiles allow the default metadata set and omit
  optional script and cron tools.
- The `minimal` and `messaging` profiles allow no local tools unless policy also
  allows specific names or groups.
- Policy entries can name tools directly, use `*`, use glob patterns, or use
  groups such as `group:file`, `group:shell`, `group:state_task`,
  `group:skill`, and `group:mcp`. Run-scoped construction also recognizes
  `group:web`, `group:script`, and `group:cron`.

There is also a run-scoped assembler exported as `createAgentTools`. It builds
tool families from `toolsAllow`:

- `undefined` includes the file-family runtime bucket and web tools.
- `[]` includes no tools.
- `*` includes the file-family runtime bucket, script, cron, and web tools.
- Group or tool-specific allow entries include only the matching families.

The file-family runtime bucket is assembled by `createFileTools`. Despite the
name, it currently contains workspace, state/task, skill, MCP connector, and
`bash` tools. In the run-scoped cron family, the compatibility `cron` tool is
filtered out and the split cron tools are used instead.

## Local Catalog

These tools are in the local catalog. A tool still has to pass profile policy,
allow or deny policy, turn ranking, and runtime context before it is exposed to
the provider.

| Tool                    | Group          | How it is used                                                                                                                                         |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `file_read`             | Core workspace | Reads a UTF-8 workspace file with optional line offset and limit.                                                                                      |
| `file_edit`             | Core workspace | Replaces exact text in a UTF-8 workspace file while preserving guarded writes.                                                                         |
| `search_files`          | Core workspace | Finds workspace paths by glob pattern.                                                                                                                 |
| `file_write`            | Core workspace | Creates or overwrites a UTF-8 workspace file while preserving guarded writes.                                                                          |
| `file_delete`           | Core workspace | Deletes a file directly, or a directory when recursive deletion is requested.                                                                          |
| `bash`                  | Core workspace | Runs a shell command in the workspace with capped output, a denied-pattern safety check, optional background mode, and approval gating.                |
| `write_todos`           | State/task     | Replaces the current run todo list.                                                                                                                    |
| `update_todo`           | State/task     | Updates one item in the current run todo list.                                                                                                         |
| `list_todos`            | State/task     | Lists the current run todo items and statuses.                                                                                                         |
| `complete_task`         | State/task     | Marks the current task or a todo item as complete.                                                                                                     |
| `write_scratch`         | State/task     | Writes run-local scratch notes for later tool calls.                                                                                                   |
| `read_scratch`          | State/task     | Reads run-local scratch notes.                                                                                                                         |
| `skill_list`            | Skill          | Lists installed skills available to the agent.                                                                                                         |
| `skill_load`            | Skill          | Loads instructions and support file metadata for an installed skill.                                                                                   |
| `skill_use`             | Skill          | Selects and loads a skill for the current task.                                                                                                        |
| `mcp_list_servers`      | MCP connector  | Lists configured MCP connector servers.                                                                                                                |
| `mcp_connect_server`    | MCP connector  | Connects to or tests a configured MCP server.                                                                                                          |
| `mcp_refresh_server`    | MCP connector  | Refreshes a configured MCP server and its discovered capabilities.                                                                                     |
| `mcp_list_tools`        | MCP connector  | Lists tools exposed by a configured MCP server.                                                                                                        |
| `mcp_load_tool`         | MCP connector  | Loads schema and metadata for one MCP tool.                                                                                                            |
| `mcp_call_tool`         | MCP connector  | Calls a tool on a configured MCP server. This tool is approval-gated.                                                                                  |
| `mcp_list_resources`    | MCP connector  | Lists resources exposed by a configured MCP server.                                                                                                    |
| `mcp_read_resource`     | MCP connector  | Reads a resource from a configured MCP server.                                                                                                         |
| `mcp_list_prompts`      | MCP connector  | Lists prompts exposed by a configured MCP server.                                                                                                      |
| `mcp_load_prompt`       | MCP connector  | Loads a prompt from a configured MCP server.                                                                                                           |
| `web_fetch`             | Web            | Fetches an HTTP or HTTPS URL and returns readable text capped at 1 MB.                                                                                 |
| `open_browser`          | Web            | Opens an HTTP or HTTPS URL in the user's default browser.                                                                                              |
| `script_run`            | Script         | Runs an existing script file with explicit arguments, interpreter selection, timeout, and output limits. It does not run arbitrary shell command text. |
| `cron_create`           | Cron           | Creates a scheduled job through `CronService`.                                                                                                         |
| `cron_read`             | Cron           | Reads one scheduled job through `CronService`.                                                                                                         |
| `cron_update`           | Cron           | Updates a scheduled job through `CronService`.                                                                                                         |
| `cron_delete`           | Cron           | Deletes a scheduled job through `CronService`.                                                                                                         |
| `cron_list`             | Cron           | Lists scheduled jobs through `CronService`.                                                                                                            |
| `cron_start`            | Cron           | Starts a paused scheduled job through `CronService`.                                                                                                   |
| `cron_stop`             | Cron           | Stops or pauses a scheduled job through `CronService`.                                                                                                 |
| `cron_run`              | Cron           | Runs a scheduled job immediately through `CronService`.                                                                                                |

The compatibility `cron` tool exists in source, but it is not part of
`LOCAL_TOOL_CATALOG`. Use the split cron tools for scheduling.

## Source Layout

`src/main/tools` groups the current tool implementations by runtime area:

| Path                         | Contents                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| `base/`                      | Workspace file tools, `exec.ts` for `bash`, and `run.ts` for scripts.    |
| `core/`                      | Catalog, schema normalization, canonical runtime wrappers, and limits.   |
| `cron/`                      | Split cron scheduling tools and the compatibility `cron` implementation. |
| `mcp/`                       | MCP server, tool, prompt, and resource helpers.                          |
| `skills/`                    | Skill list, load, and use tools.                                         |
| `startup/`                   | Bootstrap-only startup file support.                                     |
| `state/`                     | Todo and scratch-state tools.                                            |
| `web/`                       | HTTP fetch and browser-opening tools.                                    |
| `shared/`                    | Tool service, policy pipeline, selection, guards, and shared helpers.    |

## Dynamic Additions

Some tools or capabilities are added outside the local catalog.

| Tool or capability    | When it appears                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startup_files`       | Added only for full primary bootstrap mode. During that bootstrap mode, it is the only local tool exposed.                                                          |
| `heartbeat_respond`   | Added for heartbeat runs when heartbeat tool reporting is enabled. It can be forced into the prompt for heartbeat reporting.                                        |
| Connector tools       | Added for enabled, configured connectors whose names or descriptions match the user message. Connector tool names are derived from the connector and raw tool name. |
| Selected skills       | Matching skill instructions are appended to the system prompt. The default capability resolver does not expose `execute_skill` as a provider tool.                  |
| Run-scoped core tools | Available through `createAgentTools` when a caller uses run-scoped construction instead of the default `AgentService` factory.                                      |

## Turn Selection

For the default `AgentService` path, the request-level tool policy currently
allows a tool-capable run. The per-turn selector decides which tools, if any, are
actually exposed.

- If there are no candidate tools, or the user explicitly says not to use tools,
  no tools are exposed.
- Requests that match the immediate background-task phrase expose no prompt
  tools.
- Tool inventory questions expose all current candidate tools.
- Otherwise, tools are ranked by matches across tool name, display name,
  display summary, and description.
- Ranking adds intent boosts for scheduling, email, calendar, Drive, web,
  shell/script execution, file reads, file writes, file deletion, and file
  moves.
- Only tools with a positive score are selected.
- The default `AgentService` cap is 9 prompt tools.
- When selected file mutation tools depend on prior reads, `file_read` is kept
  available when it exists.
- After local selection, capability resolution can append matching connector
  tools and selected skill instructions.

The provider receives only the selected tools for the turn. Each provider tool
definition contains the exposed tool name, description, and JSON schema after
provider-safe name and schema normalization.

## Execution

The model may call any tool exposed for the turn. The runtime does not force a
tool call.

When a provider streams a tool call, the runtime collects the call id, tool name,
and JSON argument deltas. The tool is not executed when arguments are invalid
JSON, when arguments are not a JSON object, or when the requested tool was not
available for the run.

Before execution, the legacy managed path runs preflight checks:

- Identical calls are tracked per turn. The third identical call and later add a
  warning. After more than 5 identical calls, execution is blocked.
- Tools marked with `needsApproval` are rejected unless approval has already
  been cached for that exact call key.
- Tool-specific guards still run inside each tool. Examples include
  read-before-write checks for file writes and denied command patterns for
  shell execution.

The selected tool then executes with the current workspace, session id, run plan,
read-state map, abort signal, and Friday services. Tool results are appended to
the transcript as tool messages, and the agent loop calls the provider again
with the updated transcript. This repeats until the provider stops calling
tools, the run is cancelled, the context is compacted after one overflow retry,
or the max iteration limit is reached.

Tool lifecycle events are streamed to the renderer: call start, argument deltas,
parsed input, result, status, duration, and displayable output text. Run logs
record selected tool names, phase durations, iterations, and tool-call outcomes.

## Cron Scheduling

Use the split cron tools for future, delayed, recurring, reminder, wake, and
manual-run scheduling:

- `cron_create`
- `cron_read`
- `cron_update`
- `cron_delete`
- `cron_list`
- `cron_start`
- `cron_stop`
- `cron_run`

The agent should not emulate scheduling with sleep loops, shell loops,
long-running polling, or model-side timers.
