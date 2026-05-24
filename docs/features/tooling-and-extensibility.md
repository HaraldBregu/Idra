# Tooling And Extensibility

Friday's agent features are built on local tools, runtime tool construction, plugins, MCP/LSP extension points, browser automation, workspace context, and durable session state.

## Local Tools

The preloaded local tools include:

- `read`
- `write`
- `edit`
- `apply_patch`
- `delete`
- `copy`
- `move`
- `inspect_file`
- `find`
- `exec`
- `process`
- `web_fetch`
- `cron`
- `task`
- `open_browser`
- `browser`

Tool construction applies policy stages, allow/deny lists, provider schema normalization, loop detection, approval checks, tool search compaction, and runtime diagnostics.

## Browser Automation

The browser module provides managed Playwright Chromium profiles, URL policy checks, browser lifecycle control, navigation, inspection, screenshots, and page actions through agent tools.

## Workspace And Startup Context

The workspace service owns the working project context. The agent can load startup files such as `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `BOOTSTRAP.md`, and `HEARTBEAT.md` depending on run type and bootstrap state.

## Memory And Sessions

Agent sessions persist transcript, plan, and metadata. Memory search combines long-term memory, daily memory, and session transcripts. Before compaction, important session memory can be flushed so useful facts survive transcript reduction.

## Plugins, MCP, And LSP

The runtime can include host tools, plugin tools, MCP tools, LSP tools, and client-hosted tools. Plugin manifests can register providers, channels, tools, hooks, model catalogs, and agent harnesses. MCP and LSP tools are materialized only when the corresponding runtime is supplied and the agent's tool policy allows them.

## Source

- `src/main/tools`
- `src/main/browser`
- `src/main/workspace`
- `src/main/session`
- `src/main/memory-runtime.ts`
- `src/main/plugins`
- `src/main/mcp`
- `src/main/agent/harness`
- Existing docs: `docs/tools/index.md`, `docs/modules.md`

