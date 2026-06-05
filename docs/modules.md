# Main Process Modules

This document describes the current main-process modules, what each module is responsible for, and how the pieces cooperate at runtime. It intentionally stays at the module and behavior level.

| Module | Functionality | How It Works |
| --- | --- | --- |
| App shell | Owns Electron startup, process lifecycle, menus, tray behavior, shortcuts, permissions, and primary windows. | The app initializes local environment state, registers the app protocol, creates secure browser windows, wires global shortcuts and tray actions, and cleans up services during shutdown. |
| Bootstrap | Builds the main-process service graph. | It creates the service container, registers shared services, initializes workspace and user-data roots, wires IPC modules, starts long-running services, and coordinates orderly shutdown. |
| Core | Provides shared infrastructure for services. | The service container manages ownership and disposal, the event bus broadcasts typed events to windows, and window context objects attach per-window dependencies. |
| Agent | Runs assistant turns. | The agent service resolves the active provider and model, loads the session, gathers workspace and skill context, selects tools, builds the system prompt, streams the turn through a provider-neutral loop, executes tool calls, handles compaction, and persists the updated session. |
| Provider | Adapts configured model providers to a common streaming interface. | Provider records from settings are converted into adapters for Anthropic, OpenAI, Mistral, DeepSeek, Qwen, or an OpenAI-compatible fallback. Adapters normalize text deltas, reasoning, tool calls, usage, auth errors, and context-limit errors. |
| Session | Persists and repairs conversation state. | Sessions are loaded by id, locked while being written, compacted when needed, and saved after agent turns so transcripts, plans, and related metadata remain durable. |
| Memory | Supplies durable context and records durable facts. | Memory search combines long-term memory, daily memory, and session transcripts. Session memory can be flushed before compaction so important facts survive transcript reduction. |
| Tools | Provides local tools and the tool execution runtime. | Built-in tools cover filesystem work, patching, process execution, web fetches, browser automation, cron management, and task creation. The runtime validates tool inputs, applies policy, tracks approvals, enforces timeouts and limits, audits calls, and returns normalized results. |
| Skills | Adds reusable task-specific capabilities. | Skills are loaded from the user-data skill root, parsed from their manifests, ranked against the current request, checked against safety policy, and exposed to the agent through prompt context and an execution tool when needed. |
| Connectors | Integrates external accounts and service tools. | Connector settings are restored from the store, secrets are redacted for public reads, account readiness is validated, and enabled connectors contribute tools such as Google workspace actions. |
| MCP | Turns MCP servers into agent tools. | MCP configuration is resolved, environment variables are prepared, tools are discovered with timeouts and error handling, and available MCP tools are materialized into the same shape as local tools. |
| Plugins | Loads extension manifests and registered runtime surfaces. | Plugin manifests are discovered and normalized, runtime entries are activated, and declared surfaces such as tools, providers, channels, hooks, model catalogs, and agent harnesses are registered with ownership checks. |
| Channels | Receives and sends messages through external chat systems. | The channel registry manages channel catalogs, account configuration, runtime adapters, inbound admission policy, agent dispatch, and outbound delivery receipts. Telegram currently has a bundled runtime adapter; other bundled channel entries are catalog-only until a runtime is provided. |
| Cron | Schedules recurring work. | The cron service combines managed schedules, Friday cron jobs, and legacy cron jobs. It validates schedule payloads, recovers persisted schedules at startup, triggers agent tasks when due, and routes scheduled output through configured delivery targets. |
| Tasks | Runs immediate background agent work. | Background tasks are represented as in-memory records. The task handler validates input, launches an isolated agent session for the task, tracks state transitions, supports cancellation, and broadcasts task events. |
| Heartbeat | Runs periodic agent check-ins. | Heartbeat configuration controls interval, active hours, busy deferral, target agents, prompt behavior, and delivery routing. Each run invokes the agent with current provider settings and records lightweight run state. |
| Store | Persists application settings. | Settings are grouped by root keys for providers, modules, connectors, channels, scheduling, background tasks, and heartbeat. Reads normalize legacy or missing data, while public provider reads redact secrets. |
| Speech-to-text | Manages transcription sessions. | The service resolves the configured speech-to-text provider and model, starts sessions owned by renderer web contents, streams or uploads audio through the selected adapter, and cleans up sessions when owners close. |
| Browser | Provides managed browser automation. | Browser profiles are created for Playwright Chromium, URL policy blocks unsafe targets, and browser tools can open, navigate, inspect, screenshot, act on, and close pages. |
| Workspace | Manages the working project context. | The workspace service validates paths, creates the workspace if needed, optionally initializes git, and seeds or updates allowlisted context files used by the agent. |
| User data | Owns the private application data root. | The user-data service creates the application data directory with restricted permissions and guards all derived paths against traversal outside that root. |
| IPC | Exposes main-process behavior to the renderer. | IPC is split by domain. Handlers validate inputs, call the owning service, return structured results, and broadcast changes through the event bus when state changes. |
| Logger | Records application and agent activity. | The logger writes rotating app logs, maintains a recent in-memory buffer for renderer access, and records agent run audit events as structured log entries. |

## Startup Flow

1. Electron reaches app readiness and initializes the application shell.
2. Bootstrap creates shared services, registers plugins, restores settings-backed services, and wires IPC.
3. Windows, tray, menus, cron, heartbeat, and background services start.
4. Renderer actions, channel messages, scheduled jobs, and heartbeat ticks enter the same service graph and use the current store-backed configuration.
