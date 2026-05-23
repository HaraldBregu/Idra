# Main Process Modules

This page summarizes the current main-process application modules and how they
work together. It documents behavior, responsibilities, and runtime flow only.

## Module Map

| Module | Functionality | How it works |
| --- | --- | --- |
| app shell | Starts Electron, registers app-level protocol and permission handlers, creates the main window, tray window, menu, shortcuts, crash logging, and lifecycle hooks. | Bootstrapping creates shared services first, registers IPC modules, then creates window, tray, and menu managers after the app is ready. Windows use hardened defaults and renderer navigation is constrained to trusted app origins. |
| agent | Runs the assistant workflow. | Each send resolves the configured provider and model, loads the session, prepares startup context, selects tools and skills, builds the system prompt, applies before-run hooks, selects an agent harness, streams model/tool events, saves the updated session, and logs the run. |
| browser | Provides managed browser automation for agent tools. | Named profiles create Playwright-backed persistent browser contexts. The module validates HTTP/HTTPS URLs, blocks local/private targets, manages tabs, exposes snapshots and screenshots, and performs clicks, fills, key presses, selection, scrolling, focus, and close actions. |
| channels | Handles external messaging channels. | The registry keeps catalog metadata, plugin definitions, runtime adapters, channel config, and status. Catalog-only channels can be configured but cannot send or receive. Telegram has the bundled runtime for polling, inbound normalization, admission checks, agent dispatch, replies, and durable send receipts. |
| connectors | Manages configured external service connectors. | Connector records are stored centrally, normalized, redacted for display, and restored on startup. Google connectors use OAuth, refresh tokens, and local tool implementations for Gmail, Calendar, and Drive. Enabled connectors can produce agent tools and MCP tool descriptors. |
| core | Provides shared main-process infrastructure. | The service container registers singleton services and disposes them on shutdown. The event bus broadcasts renderer events and typed main-process events. Window factories and window contexts keep window creation and per-window state consistent. |
| cron | Schedules future and recurring work. | The cron service owns managed schedules, Friday cron jobs, and legacy cron tasks. Managed schedules persist timing state, enforce access and frequency policy, calculate next runs, recover missed runs, and create background agent tasks when due. Friday cron powers the agent-facing cron tool and can route results through channels. |
| heartbeat | Runs periodic agent check-ins. | Heartbeats read store-backed agent heartbeat settings, apply active-hours and busy checks, run an agent turn with heartbeat-specific prompt behavior, interpret acknowledgments, update compact runtime state, and optionally deliver alerts through channel routing. |
| ipc | Defines the renderer-to-main boundary. | Each IPC module owns one domain and registers handlers through shared wrappers that return consistent success or error results. App, agent, channels, connectors, cron, heartbeat, transcription, tasks, skills, and window operations are exposed through this layer. |
| logger | Records application and agent run activity. | The logger buffers main-process logs, writes daily log files, keeps an in-memory recent-log ring buffer for the UI, and flushes on shutdown. Agent runs also get append-only JSONL audit records with starts, iterations, tool calls, approvals, and finishes. |
| memory | Searches and flushes durable workspace memory. | Memory search indexes markdown memory files and selected session transcripts, scores keyword matches, supports bounded file reads, and can append session summaries to daily memory files before compaction. |
| mcp | Bridges configured connectors to MCP-style tools. | Enabled connectors with authorization become MCP tool records for model runtimes. The module also provides safe environment filtering, timeout handling, retry helpers, and normalized MCP error types. |
| plugins | Discovers and loads Friday connector plugins. | Plugin manifests are scanned from trusted roots, normalized, checked for unsafe paths, and loaded through a constrained API. Plugins can register tools, providers, channels, model catalogs, agent harnesses, hooks, setup descriptors, and other runtime surfaces according to the activation mode. |
| provider | Adapts model providers to Friday's streaming agent contract. | Provider adapters translate sessions, tool specs, reasoning effort, tool calls, token usage, and provider errors into one stream format. Current chat runtimes include Anthropic, OpenAI Responses, OpenAI-compatible Chat Completions, DeepSeek, Mistral, and Qwen. |
| runtime | Assembles tools for a single run attempt. | The runtime helper builds the allowed tool set, applies policy and compaction, converts runtime tools into model tool definitions, and returns the valid tool-name set used by an agent attempt. |
| session | Persists agent conversations. | Sessions are stored as JSON files with an index. Reads repair malformed tool-use/tool-result ordering, writes sanitize large or binary tool output, and file locks prevent overlapping writes from corrupting a session. |
| skills | Manages reusable agent skills. | Skills are registered, imported, discovered, ranked, selected, and executed with scoped tools, connectors, memory policy, safety checks, provenance, audit logs, timeouts, retries, and version selection. |
| store | Persists app settings and module state. | The settings store owns provider credentials, model selections, scheduler state, heartbeat state, connectors, and channels. Reads normalize older or partial data, writes keep each module's data under its own root key, and public accessors redact secrets where needed. |
| stt | Runs realtime and batch speech-to-text sessions. | A transcription session resolves the configured provider and model, chooses a matching adapter, binds the session to the requesting renderer, streams transcription events back, accepts audio chunks, and closes on finish, cancel, owner destruction, or provider completion. |
| tasks | Runs immediate background agent tasks. | Task handlers are registered by type. The current user-facing task type runs an agent instruction in an isolated task session, reports progress, supports cancellation, sanitizes metadata/results/errors, emits task events, and keeps records in memory for the app session. |
| templates | Seeds startup context files. | Bundled markdown templates provide default agent and workspace context files. Startup and workspace services copy them into user data when needed and skip completed bootstrap files. |
| tools | Provides local and dynamic agent tools. | Local tools cover filesystem, shell, process, web fetch, cron, background task, browser, and external browser opening. Tool construction applies allow/deny policy, plugin/MCP/LSP expansion, schema normalization, loop checks, approval tracking, execution limits, output validation, and optional tool-search compaction. |
| user-data | Owns the private Friday data root. | The service resolves paths under the user's private app data directory, creates the root with restricted permissions, rejects absolute or traversal path segments, and verifies existing paths stay inside the root. |
| workspace | Owns Friday's managed workspace. | The workspace service creates the workspace, initializes Git for new workspaces when available, safely reads and writes allowlisted context files, blocks symlink/hard-link escapes, tracks bootstrap completion, and exposes bounded context for agent prompts. |

## Runtime Flow

1. Bootstrapping registers shared services, then IPC modules.
2. Windows, tray, menu, shortcuts, protocol handling, and permission handlers are attached.
3. Renderer requests enter through IPC and call the relevant service.
4. Agent requests resolve store-backed provider/model settings, prepare context,
   choose tools and skills, run through the selected harness, persist the
   session, and emit events.
5. Background tasks, cron jobs, heartbeats, channels, and connectors reuse the
   same store-backed agent execution path rather than carrying provider secrets
   in their own payloads.
