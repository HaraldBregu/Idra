# Tools

This document lists the current tools grouped by the filename where they are defined. File paths are intentionally omitted.

Policies are summarized from the current tool policy code. Global allow/deny filters can still hide any tool. Tools marked `explicit/imported` are not part of the legacy `ALL_TOOLS` registry and are normally exposed only by a specific construction or import path.

## `app.ts`

| Tool | Policies |
| --- | --- |
| `open_browser` | Legacy profile: `full` or explicit allow. Allows only `http` and `https` URLs. |

## `cron.ts`

| Tool | Policies |
| --- | --- |
| `cron` | Legacy profiles: `coding`, `standard`, `full`. Owner-only. Mutating actions `add`, `update`, `remove`, `run`, and `wake` carry the legacy approval marker. |
| `cron_add` | `explicit/imported`. Carries the legacy approval marker. |
| `cron_list` | `explicit/imported`. Read-only scheduler listing. |
| `cron_remove` | `explicit/imported`. Carries the legacy approval marker. |

## `exec-tool.ts`

| Tool | Policies |
| --- | --- |
| `exec` | Runtime group: `group:shell`. Runtime profiles: `coding`, `full`. Removed when sandbox disallows shell tools. Dangerous command patterns are denied; output and timeout are capped. |

## `exec.ts`

| Tool | Policies |
| --- | --- |
| `exec` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:shell`. Carries the legacy approval marker. Dangerous command patterns are denied; output and timeout are capped. |
| `process` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:shell`. Limited to background processes started by `exec`. |

## `fs.ts`

| Tool | Policies |
| --- | --- |
| `apply_patch` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Carries the legacy approval marker. Disabled by read-only filesystem policy; requires prior read state and workspace path policy. |
| `copy` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Carries the legacy approval marker. Disabled by read-only filesystem policy; destination overwrite requires prior read state. |
| `delete` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Carries the legacy approval marker. Disabled by read-only filesystem policy; files require prior read state; root, workspace root, and home directory are guarded. |
| `edit` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Carries the legacy approval marker. Disabled by read-only filesystem policy; requires prior read state. |
| `find` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Uses workspace path policy and excludes `node_modules` and `.git`. |
| `inspect_file` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Uses workspace path policy and records read state. |
| `move` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Carries the legacy approval marker. Disabled by read-only filesystem policy; source and overwritten destination require prior read state. |
| `read` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Uses workspace path policy and records read state. |
| `write` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:file`. Carries the legacy approval marker. Disabled by read-only filesystem policy; overwrites require prior read state. |

## `plan.ts`

| Tool | Policies |
| --- | --- |
| `update_plan` | Runtime group: `group:planning`. Runtime profiles: `minimal`, `coding`, `full`. Session coordination tool; no mutation outside the in-memory plan. |

## `read-tool.ts`

| Tool | Policies |
| --- | --- |
| `read` | Runtime group: `group:file`. Runtime profiles: `coding`, `full`. Core tool. Workspace-only by default unless absolute paths are explicitly allowed. |

## `services.ts`

| Tool | Policies |
| --- | --- |
| `get_agent_model` | `explicit/imported`. Read-only agent model lookup. |
| `get_agent_service` | `explicit/imported`. Read-only agent service lookup. |
| `set_agent_service` | `explicit/imported`. Carries the legacy approval marker and writes agent service configuration. |

## `startup.ts`

| Tool | Policies |
| --- | --- |
| `startup_files` | Legacy profile: `full` or explicit allow. `write` and `complete_bootstrap` actions carry the legacy approval marker. Restricted to allowlisted startup files. |

## `tool-search.ts`

| Tool | Policies |
| --- | --- |
| `tool_call` | Tool-search compaction control. Available when compaction is enabled or explicitly allowed. Executes only tools already present in the hidden, policy-filtered catalog. |
| `tool_describe` | Tool-search compaction control. Available when compaction is enabled or explicitly allowed. Reads schema and metadata for hidden catalog tools. |
| `tool_search` | Tool-search compaction control. Available when compaction is enabled or explicitly allowed. Searches hidden catalog tools by keyword. |

## `tool.ts`

| Tool | Policies |
| --- | --- |
| `browser` | Legacy profile: `full` or explicit allow. Browser URL policy allows only `http` and `https` and blocks local, private, and metadata hosts. |

## `update-plan-tool.ts`

| Tool | Policies |
| --- | --- |
| `update_plan` | Runtime group: `group:planning`. Runtime profiles: `minimal`, `coding`, `full`. Core session coordination tool; no mutation outside the current plan callback. |

## `web.ts`

| Tool | Policies |
| --- | --- |
| `web_fetch` | Legacy profiles: `coding`, `standard`, `full`. Runtime group: `group:web`. Allows only `http` and `https`; response size is capped. |

## `workspace.ts`

| Tool | Policies |
| --- | --- |
| `get_workspace_content` | `explicit/imported`. Read-only workspace listing through the workspace service, with depth and result limits. |
| `get_workspace_path` | Runtime profile: `minimal` or explicit allow. Read-only workspace path lookup. |
