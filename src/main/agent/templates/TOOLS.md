# Tools

Friday exposes only the explicitly requested tool registry. The source of truth
is `src/shared/tools/catalog.ts`, and runtime schemas live in
`src/main/tools/requested/tools.ts`.

## Local Catalog

| Tool | Purpose |
| --- | --- |
| `web.run` | Web search, page reading, live data, finance, weather, sports, time, and image search. |
| `image_gen.imagegen` | Image generation and uploaded image editing. |
| `functions.exec_command` | Shell command execution. |
| `functions.write_stdin` | Input and polling for an existing shell command session. |
| `functions.apply_patch` | Structured source patching. |
| `functions.view_image` | Local image inspection. |
| `functions.update_plan` | Visible task-plan updates. |
| `functions.get_goal` | Thread goal status reading. |
| `functions.create_goal` | Thread goal creation. |
| `functions.update_goal` | Thread goal completion or blocked-state update. |
| `functions.list_mcp_resources` | MCP resource listing. |
| `functions.list_mcp_resource_templates` | MCP resource template listing. |
| `functions.read_mcp_resource` | MCP resource reading. |
| `functions.request_user_input` | Structured user input in Plan mode. |
| `multi_tool_use.parallel` | Parallel developer-tool execution. |
| `tool_search.tool_search_tool` | Deferred tool discovery. |
| `multi_agent_v1.spawn_agent` | Sub-agent creation. |
| `multi_agent_v1.resume_agent` | Closed sub-agent resumption. |
| `multi_agent_v1.send_input` | Sub-agent input delivery. |
| `multi_agent_v1.wait_agent` | Waiting on sub-agent completion. |
| `multi_agent_v1.close_agent` | Sub-agent closure. |

Connector tools, old filesystem/workspace tools, cron tools, state tools, skill
tools, shell wrapper tools, and bootstrap-only tool definitions are not added to
the model-facing tool registry.
