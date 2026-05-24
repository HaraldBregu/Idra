# Features

This folder documents Friday's current feature surface from the source tree and the existing docs. Status labels are intentionally explicit:

- Runtime implemented: source code contains a local execution path.
- Partial runtime: some providers, channels, or modes work locally while others are catalog-only.
- Catalog or pending runtime: Friday exposes settings, model catalogs, documentation, or extension contracts, but local execution still needs an adapter, provider-hosted tool, or plugin runtime.

## Feature Map

| Feature | Current Status | Notes |
| --- | --- | --- |
| [Agents and subagents](agents-and-subagents.md) | Runtime implemented | The main assistant runs provider-neutral turns with sessions, tools, skills, memory, startup files, and optional harness runtimes. Subagents can be spawned as background child sessions through `sessions_spawn` and managed with `subagents`. |
| [Skills](skills.md) | Runtime implemented | Skills are installed locally, parsed from manifests, ranked for the current prompt, added to agent context, and optionally executed through a controlled skill tool. |
| [Channel support](channels.md) | Partial runtime | Telegram has a bundled runtime. Discord, Slack, Google Chat, Microsoft Teams, WhatsApp, Signal, Matrix, IRC, and other entries are present in the channel catalog and docs, but are catalog-only until runtime adapters are registered. |
| [Background tasks](background-tasks.md) | Runtime implemented | Immediate background agent work uses the task manager, lifecycle events, cancellation, policy checks, and isolated task sessions. |
| [Heartbeat health checks](heartbeat.md) | Runtime implemented | Heartbeat runs periodic or manual agent check-ins, handles active hours and flood guards, and can route actionable alerts to the app or channels. |
| [Cron scheduled tasks](cron-scheduled-tasks.md) | Runtime implemented | Managed schedules, Friday cron jobs, and legacy node-cron jobs can create background tasks, wake heartbeat, and deliver output. |
| [Multiprovider and multimodel support](providers-and-models.md) | Partial runtime | Assistant runtime supports Anthropic, OpenAI, Mistral, DeepSeek, Qwen, and OpenAI-compatible providers. Speech-to-text has runtime adapters for six providers. Other model operators have catalogs or settings surfaces pending runtime. |
| [Connectors and MCP](connectors.md) | Partial runtime | Local Google Gmail, Calendar, and Drive connectors have OAuth and tool execution. OpenAI-style connector config, MCP tool materialization, and plugin connector contracts are present for broader extension. |
| [Multiplatform desktop application](desktop-application.md) | Runtime implemented | Friday is an Electron desktop app with a React renderer, typed IPC, tray/menu/shortcut support, secure windows, and packaging scripts for macOS, Windows, and Linux. |
| [Coding agents in the background](coding-agents-in-background.md) | Runtime implemented | Background `agent.run` and `subagent.run` tasks can use coding tools when allowed by tool policy and workspace configuration. |
| [Tooling and extensibility](tooling-and-extensibility.md) | Runtime implemented with extension points | Local tools, browser automation, plugin manifests, MCP/LSP hooks, startup files, workspace management, and session compaction are available to support agent workflows. |
| [Realtime transcription](realtime-transcription.md) | Runtime implemented | Renderer-owned speech-to-text sessions stream audio through OpenAI, Deepgram, ElevenLabs, Mistral, xAI, or Qwen adapters. |
| [Browser automation](browser-automation.md) | Runtime implemented | Managed Playwright Chromium profiles expose lifecycle, tabs, navigation, snapshots, screenshots, and page actions through the browser tool. |
| [Memory, sessions, and workspace context](memory-sessions-workspace.md) | Runtime implemented | Sessions persist transcripts and plans, workspace startup files shape prompts, and memory search indexes workspace memory plus visible sessions. |
| [Plugins and agent harnesses](plugins-and-agent-harnesses.md) | Runtime implemented with extension points | Plugin manifests can register providers, channels, tools, hooks, setup/runtime entries, model metadata, and [agent harness runtimes](../harness/index.md). |

## Completeness Notes

- The requested feature set is represented in source and docs.
- The strongest runtime paths are the main assistant, subagents, skills, background tasks, heartbeat, cron, desktop shell, local tools, browser automation, transcription, memory/session handling, and workspace context.
- Partial areas are intentionally documented as partial: channels have a bundled Telegram runtime plus catalog-only entries, connectors have local Google runtimes plus catalog/provider-hosted entries, and provider/model catalogs are broader than the local execution adapters.
- Catalog-only entries are useful for settings, docs, setup planning, and plugin/runtime extension, but they are not complete local execution until an adapter, MCP server, provider-hosted tool, or plugin runtime is registered.

## Source Landmarks

- Main agent runtime: `src/main/service.ts`, `src/main/agent/run.ts`
- Subagents: `src/main/agent/subagents`
- Skills: `src/main/skills`
- Channels: `src/main/channels`, `src/shared/channels`
- Tasks: `src/main/tasks`, `src/shared/tasks.ts`
- Cron: `src/main/cron`, `src/shared/cron.ts`
- Heartbeat: `src/main/heartbeat`, `src/shared/heartbeat.ts`
- Providers and models: `src/main/provider`, `src/main/stt`, `src/shared/providers`
- Connectors and MCP: `src/main/connectors`, `src/main/mcp`, `src/shared/connector`
- Desktop shell and UI: `src/main`, `src/preload`, `src/renderer/src`
- Browser automation: `src/main/browser`
- Plugins and agent harnesses: `src/main/plugins`, `src/main/agent/harness`
- Memory, sessions, and workspace context: `src/main/memory-runtime.ts`, `src/main/session`, `src/main/workspace`
