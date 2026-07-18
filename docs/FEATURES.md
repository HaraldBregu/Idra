# Friday Feature Reference

Friday is a cross-platform Electron desktop assistant that turns chat requests into model responses, tool calls, local file and process work, web research, generated media, background checks, and messaging-channel replies.

This document describes the feature set present in the current source tree. It distinguishes working behavior from surfaces that are only partially wired so that a visible setting or catalog entry is not mistaken for an end-to-end capability.

## Feature status

| Status       | Meaning                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Available    | The current renderer and main process are connected to an implementation. Provider credentials or OS permissions may still be required. |
| Partial      | A useful portion is implemented, but an important control or execution path is missing.                                                 |
| Placeholder  | A visible control or surface exists, but its intended workflow is not connected.                                                        |
| Catalog only | The provider or model is selectable or described, but no working execution adapter is present.                                          |

## Contents

- [Product overview](#product-overview)
- [First-run setup](#first-run-setup)
- [Conversation experience](#conversation-experience)
- [Sessions and conversation history](#sessions-and-conversation-history)
- [Agent runtime](#agent-runtime)
- [Permissions and execution control](#permissions-and-execution-control)
- [Personalization, workspace, and memory](#personalization-workspace-and-memory)
- [Skills](#skills)
- [MCP servers](#mcp-servers)
- [Scheduled tasks](#scheduled-tasks)
- [Periodic health checks](#periodic-health-checks)
- [Speech services](#speech-services)
- [Image, video, and audio generation](#image-video-and-audio-generation)
- [Chat and research providers](#chat-and-research-providers)
- [Messaging channels](#messaging-channels)
- [Settings and desktop integration](#settings-and-desktop-integration)
- [Privacy, storage, and security](#privacy-storage-and-security)
- [Platform and packaging](#platform-and-packaging)
- [Source map](#source-map)

## Product overview

Friday provides:

- Persistent, streaming conversations with multiple local chat sessions.
- Image and PDF attachments for multimodal requests.
- Live or recorded speech-to-text input and text-to-speech playback.
- An agent loop that can use files, patches, commands, long-running processes, the web, a browser, memory, skills, MCP tools, media generation, automation tools, and one-level subagents.
- Independent provider and model selection for chat, transcription, speech, image, video, audio, scheduled work, health checks, and messaging channels.
- Local skills, remote HTTP MCP servers, and local stdio MCP servers.
- Persistent schedules and periodic `HEALTH.md` checks.
- Telegram and Discord bot connections with sender policies.
- Local configuration, conversation history, memory, generated-media storage, and operational logs.
- Windows, macOS, and Linux packaging; partial English and Italian localization; light, dark, and system themes.

## First-run setup

The first launch uses a three-step setup flow:

1. **Welcome** introduces Friday as a personal agent for everyday tasks, coding, and background work.
2. **Providers** requires at least one provider API key. Each provider card links to its key or configuration page and supports connect, edit, cancel, and save states.
3. **Models** selects models for Assistant, Voice, Transcription, Image, Video, Audio, Tasks, and Health. Only the Assistant selection is required to finish.

When an Assistant provider and model are already stored, Friday skips setup and opens the chat screen. The same provider keys and service selections can be changed later in Settings.

Provider API keys are stored in Friday's local application data and are masked after saving. Requests and credentials are still sent to the configured provider as required for authentication and inference.

## Conversation experience

### Chat input

- The multiline TipTap prompt editor supports Markdown-oriented editing and keyboard submission.
- `Enter` sends when appropriate; modified Enter and structural contexts such as lists or code blocks retain their editor behavior.
- `Cmd/Ctrl+/` focuses the prompt editor.
- The send button becomes a stop button while a response is running. Stopping aborts the active run and rejects pending tool-approval requests.
- Starting a new request for the same agent also cancels that agent's previous active request.
- Empty conversations offer guided prompts for introductions, day planning, image generation, video generation, music composition, recurring tasks, and web search.

### Attachments

- Multiple images and PDFs can be attached to one request.
- Attachment chips show the filename and size and can be removed before sending.
- Files are encoded locally and included as multimodal message blocks.
- OpenAI receives images and files as data URLs; Anthropic receives image or PDF content blocks; other OpenAI-compatible providers receive the corresponding chat content representation.
- The renderer does not impose a user-facing attachment-size limit. Provider limits still apply.

### Slash commands

Typing `/` opens a keyboard- and mouse-accessible command menu:

- `/skill` selects and invokes an installed skill.
- `/goal <objective>` creates a durable goal for the current conversation. Active goals continue only after tool-using turns, keep their usage budget in `goal.json`, and require an evidence audit before completion.
- `/goal` shows the current thread goal; `/goal pause`, `/goal resume`, and `/goal clear` control its lifecycle.
- `/task_list` asks for the scheduled-task list.
- `/create_task` asks the agent to create a schedule.
- `/delete_task` asks the agent to delete a schedule.

Installed skill names become searchable entries after `/skill`. Task commands are expanded into agent instructions before the message is sent.

### Voice input and playback

- With a streaming speech-to-text model, Friday captures mono PCM audio and appends partial and final transcript events live.
- With a batch-only model, Friday records audio locally, submits it when recording stops, and appends the returned transcript.
- Dictation includes microphone permission checks, elapsed time, mute, confirm, cancel, and error states.
- Assistant responses can be read aloud through the configured text-to-speech provider.
- The empty-editor **voice conversation** control currently opens an animated conversation panel only. It does not start a realtime model, microphone-to-agent loop, or automatic spoken-response loop, so it is a placeholder rather than a working voice conversation mode.

### Response rendering

- Assistant output streams into the current response.
- GitHub-flavored Markdown, headings, lists, tables, blockquotes, line breaks, inline code, and syntax-highlighted code blocks are rendered.
- External links open outside the application.
- Copy, read-aloud, and reply/focus actions are available on assistant messages.
- Tool calls are grouped into collapsible activity summaries and show running, completed, or error states, input, output, duration, and tool-call identifiers.
- Generated images, video, and audio appear inline. Local media can be played without leaving the conversation.
- Image context menus can open, reveal, copy the image, copy its path, or save a copy. Video and audio menus can open, reveal, copy the path, or save a copy.
- Earlier long user messages collapse. A More/Less control is also rendered for earlier long assistant messages, but it currently does not change the assistant content layout.

## Sessions and conversation history

- The title-bar history menu starts a new UUID-backed conversation or switches to an existing one.
- Sessions are listed newest first and titled from the first user message, shortened to 60 characters.
- Switching sessions restores its stored transcript; the Home view loads at most the last 50 stored messages before expanding tool results.
- Settings includes a Chat History screen with session title, creation date, and confirmation-backed deletion.
- Session storage is separated into `main`, `task`, `health`, and `bot` categories.
- Each stored session can contain `messages.json`, append-only `run.jsonl`, the first system prompt, and the latest system prompt.

There is a clear-messages API in the runtime, but the current Chat History screen exposes per-session deletion rather than a separate clear button.

## Agent runtime

Friday uses an iterative tool-calling loop:

1. Build a system prompt from the base assistant contract, tool descriptions, workspace profile files, persistent memory, and any skill loaded during the run.
2. Stream a model turn and collect text, reasoning continuity where supported, and tool calls.
3. Run requested tools, stream their activity into the conversation, and append results to the transcript.
4. Continue until the model returns no tool calls, the request is cancelled, an error occurs, or the 20-turn session limit is reached.

Each model turn currently allows up to 4,096 output tokens and is retried once after a provider failure.

The Home prompt classifier computes `none`, `medium`, or `high` reasoning based on prompt language, length, and code context. The current send path drops that `effort` before model execution; `lightContext`, `toolsAllow`, and `toolsDeny` are also dropped. These Home options therefore have no execution effect at present.

### Built-in tools

| Area       | Tools and behavior                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files      | Read a complete UTF-8 file, create or overwrite a text file, replace one exact unique match, and apply structured multi-file patches.                                                                               |
| Commands   | Run a shell command with working directory, environment, timeout, yield/background behavior, and optional PTY. Host elevation, gateway execution, and remote-node execution are not implemented in this runtime.    |
| Processes  | List, poll, page through logs, write text, submit text, paste, send special keys, kill, clear, or remove retained long-running process sessions.                                                                    |
| Web search | Query the selected Brave or Tavily engine for 1–20 results using its API key from Settings. `BRAVE_API_KEY` and `TAVILY_API_KEY` remain available as environment fallbacks.                                         |
| Web fetch  | Fetch public HTTP(S) pages or JSON, follow up to three redirects, convert HTML to plain text, and truncate long output. Private, loopback, and link-local targets are blocked.                                      |
| Browser    | Start or stop a persistent visible Chrome profile; manage tabs; navigate; take DOM/text snapshots, screenshots, or PDFs; read console output; and click, type, press, hover, drag, select, fill, wait, or evaluate. |
| Media      | Generate an image, video, music track, or sound effect with the configured service and save agent-created output in the media library.                                                                              |
| Memory     | Save a durable fact or forget all saved facts containing a case-insensitive match.                                                                                                                                  |
| Skills     | Load an enabled skill's `SKILL.md` instructions and return its directory path to the current run.                                                                                                                   |
| MCP        | Load enabled server tools dynamically as `mcp__<server>__<tool>`.                                                                                                                                                   |
| Schedules  | Create, update, pause, resume, delete, inspect, list, or trigger persistent schedule records. See [Scheduled tasks](#scheduled-tasks) for the execution limit.                                                      |
| Health     | Replace the `HEALTH.md` checklist or update health-run settings.                                                                                                                                                    |
| Bootstrap  | Complete the one-time conversational bootstrap after profile files have been written.                                                                                                                               |
| Subagents  | Run one independent subagent with a fresh conversation and the same tool set except further subagent spawning.                                                                                                      |

Subagents are non-interactive. Any tool that resolves to `ask` is denied because a subagent cannot present a permission card to the user.

## Permissions and execution control

The Policies screen provides persistent controls for sensitive tools:

- Every tool owns a top-level policy object with `default`, `allow`, `ask`, and `deny` fields.
- The top-level `dir` map assigns directory-scoped tool allow-lists using `{ "recoursive": boolean, "tools": "*" | string[] }` entries.
- `read` and `write` default to **Allow**; `edit`, `exec`, and `apply_patch` default to **Ask**.
- Other built-in tools retain independent **Allow** defaults.
- An interactive permission card offers **Deny**, **Allow once**, and **Always allow**.
- An always-allow decision stores the containing folder for `read`, the exact target for other file and patch tools, and the raw command for `exec`.
- Tool-specific paths and commands can be added to or removed from the `allow`, `ask`, and `deny` lists.
- The policy can be reset to defaults.

Directory permissions use this top-level structure:

```json
"dir": {
  "/path/to/folder": { "recoursive": true, "tools": "*" },
  "/path/to/another/folder": { "recoursive": true, "tools": ["read"] }
}
```

Rule resolution is tool-local:

- The first layer is the built-in system policy: every path-aware tool is allowed recursively inside the agent directory.
- If the system layer does not allow the whole call, the second layer checks `dir`. The call is allowed when every target is covered by a matching directory entry that lists the tool.
- If the directory layer does not allow the whole call, resolution continues to the third layer: the named tool's explicit rules and default.
- A file path matches that file, while a directory path also matches its descendants.
- The most specific matching path wins; equally specific rules use **Deny**, then **Ask**, then **Allow** precedence.
- `exec` supports exact command rules and a trailing `:*` prefix form such as `git push:*`.
- A rule for one tool never changes another tool's decision.
- A matching `dir` entry allows listed tools early. An unlisted tool falls through to its own policy instead of being denied by the directory layer. `"*"` allows every tool.
- Nested directory entries use the most-specific match. `recoursive: true` includes descendants; `false` covers direct files only.
- System and directory approval happen before per-tool path or command rules.

Important boundaries:

- `exec` policy resolution examines the command string; it is not an operating-system sandbox and cannot prove which paths a command will access.
- Directory policy resolves `exec` from its working directory, but commands can still access paths outside that directory.
- Relative policy paths such as `Desktop` resolve from the user home directory.
- Defaults and rule lists are editable from Settings for every stored tool policy.

## Personalization, workspace, and memory

Friday maintains an agent workspace in local application data with these Markdown files:

| File           | Purpose                                                         |
| -------------- | --------------------------------------------------------------- |
| `AGENTS.md`    | Standing behavior and workspace instructions.                   |
| `BOOTSTRAP.md` | One-time conversational setup instructions for a fresh profile. |
| `IDENTITY.md`  | Assistant identity and presentation.                            |
| `SOUL.md`      | Personality and behavioral guidance.                            |
| `USER.md`      | User profile and preferences.                                   |
| `MEMORY.md`    | Durable facts loaded into every conversation.                   |
| `HEALTH.md`    | Checklist used by periodic health runs.                         |

If `USER.md` has no completed profile, `BOOTSTRAP.md` is included in the system prompt. Completing bootstrap removes that file after the identity, user, and soul files have been updated.

`memory_save` adds one bullet fact without duplicating an identical line. `memory_forget` removes every bullet containing the requested text, case-insensitively. Workspace profile and memory content are rebuilt into the system prompt before each model turn.

## Skills

Skills are local directories under the agent's `skills` folder and must contain `SKILL.md`.

The Skills settings area can:

- List installed skills with name and description.
- Open the skills root in the system file manager.
- Refresh the catalog.
- Import one or more selected skill directories and report imported and skipped counts.
- Inspect ID, format, version, category, safety level, visibility, author, required and allowed tools, required connectors, tags, model visibility, folder path, skill-file path, and validation diagnostics.
- Enable or disable a skill.
- Export/download a skill directory.
- Delete a skill after confirmation.

Validation requires frontmatter `name` and `description`. Names are lowercase alphanumeric/hyphen identifiers of 1–64 characters, and descriptions are limited to 1,024 characters. Importing an existing ID replaces its folder. Only enabled skills can be loaded by the agent.

The Home slash menu searches installed skills, and the agent can load a selected skill's `SKILL.md` instructions during a run. The loader returns the skill directory path; bundled scripts, references, and assets must be read separately when needed.

## MCP servers

Friday supports two MCP transport types:

| Transport   | Configuration                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Remote HTTP | Server ID, name, URL, optional bearer token, and optional OAuth client ID and client secret.                                                |
| Local stdio | Server ID, name, command, whitespace-split arguments, optional `KEY=value` environment variables, and an optional stored working directory. |

MCP settings provide:

- Separate lists for remote and local servers.
- Configured, disabled, and error states.
- Add and edit dialogs. Server ID and transport type are fixed after creation.
- A detail page with ID, status, URL or command/arguments, authentication type, refresh/update timestamps, and the last error.
- OAuth authorization for HTTP servers without a bearer token, including reauthorization.

At the start of each normal agent run, enabled servers connect in parallel, expose their tools to the model, and close when the run ends. Unreachable or unauthenticated servers are skipped for that run.

Current limits:

- The renderer has no delete or enable/disable control even though disabled server metadata is supported.
- Stored `require_approval` and `defer_loading` fields are not enforced by the tool loader.
- Dynamically loaded MCP tools are not included in the built-in gated-tool list.

## Scheduled tasks

Friday persists cron schedule records with:

- A name and optional description.
- A cron expression.
- Enabled or paused state.
- A debug-message or agent-prompt action.
- Created and updated timestamps.
- Create, update, pause, resume, delete, get, list, and run-now operations.
- A separate provider and model selection for scheduled work.
- Startup reconciliation that reloads and reschedules persisted records.

The Tasks settings screen selects the task provider/model and lists each schedule's name, prompt or message, cron expression, and enabled state. Schedule creation and management are driven through the agent and slash commands rather than direct Settings forms.

**Partial:** the current cron callback logs debug actions and creates trigger/task metadata, but its agent-action branch does not call the agent. Scheduled prompts and **Run now** therefore do not execute an agent request yet.

## Periodic health checks

`HEALTH.md` defines a checklist that Friday can run in the background.

Available behavior:

- Intervals of Off, 1 minute, 30 minutes, or 1 hour.
- Skip while the main or health agent is busy.
- Optional daily time windows or inclusive start/end date ranges.
- An isolated `health` session when enabled.
- Heading-only or empty checklists are skipped.
- A response of exactly `HEALTH_OK` is treated as healthy; other responses are logged as needing attention.
- The Health screen can read, edit, and save the checklist and configuration. An unmounted runtime API can reset the health configuration, but the screen has no reset action and there is no checklist-reset API.

The Health settings screen exposes provider, model, interval, target, direct policy, start/end dates, and the checklist editor. The agent tool can additionally update light-context, isolated-session, skip-when-busy, active-hours, and include-reasoning fields.

**Partial:** the runtime currently applies interval, busy checks, active hours/dates, and isolated-session behavior. Stored target, direct policy, light context, include reasoning, provider, and model fields are not consumed by `runHealthCheck`; health runs use the agent's normal active model.

## Speech services

### Speech-to-text

Realtime and recorded transcription use independent saved selections. Settings filters models by whether they implement streaming or batch transcription and provides a live test and a record-then-transcribe test.

| Provider   | Models                                                          | Modes                                      |
| ---------- | --------------------------------------------------------------- | ------------------------------------------ |
| Deepgram   | Nova 3; Flux                                                    | Nova 3: batch and stream; Flux: stream     |
| ElevenLabs | Scribe v2; Scribe v2 Realtime                                   | Batch; stream                              |
| Mistral    | Voxtral Mini 2602; Voxtral Mini Transcribe Realtime 2602        | Batch; stream                              |
| OpenAI     | GPT-4o Transcribe; GPT-4o Mini Transcribe; GPT Realtime Whisper | First two: batch; Realtime Whisper: stream |
| Qwen       | Qwen3 ASR Flash Realtime                                        | Stream                                     |
| xAI        | xAI STT Batch; xAI STT Streaming                                | Batch; stream                              |

The transcription API accepts optional language, prompt, temperature, and sample-rate settings. Batch audio is capped at 64 MiB of encoded input, and realtime chunks are capped at 256 KiB.

### Text-to-speech

Settings selects a provider/model and can synthesize and play editable sample text. Responses can use the same service for read-aloud playback. Input text is required and capped at 4,096 characters.

| Provider   | Models                                               |
| ---------- | ---------------------------------------------------- |
| Cartesia   | Sonic 3.5; Sonic 3                                   |
| Deepgram   | Aura 2                                               |
| ElevenLabs | Eleven v3; Eleven Multilingual v2; Eleven Flash v2.5 |
| Google     | Gemini 3.1 Flash TTS Preview                         |
| MiniMax    | Speech 2.8 HD; Speech 2.8 Turbo                      |
| Mistral    | Voxtral Mini TTS 2603                                |
| OpenAI     | GPT-4o Mini TTS; TTS-1 HD                            |

All text-to-speech providers in this table have runtime adapters.

## Image, video, and audio generation

Media can be generated from the dedicated Settings studios or by agent tools during a conversation.

- Each studio persists an independent provider/model selection and accepts a text prompt.
- Image results are previewed in the studio.
- Video results are playable and can expose their local-file menu.
- The audio studio refreshes a dated local list and plays saved tracks.
- Agent-created image, video, and audio files are saved under `agent/library` and displayed automatically in chat.
- Standalone video and audio outputs are stored in their feature-specific application-data folders. Standalone image generation returns image data to the studio without adding it to the unified library.

### Image adapters

| Status       | Provider and models                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Available    | Black Forest Labs: FLUX.2, FLUX.1 Kontext Pro, FLUX1.1 Pro Ultra                                             |
| Available    | Google: Gemini 3.1 Flash Image Preview, Gemini 3 Pro Image Preview                                           |
| Available    | Ideogram: 3.0, 2a                                                                                            |
| Available    | Luma: Uni 1.1                                                                                                |
| Available    | Qwen: Qwen Image, Qwen Image Edit                                                                            |
| Available    | Stability AI: Stable Image Ultra, Stable Image Core                                                          |
| Available    | xAI: Grok Imagine Image, Grok Imagine Image Quality                                                          |
| Catalog only | Midjourney v8.1 and v7 are selectable, but the runtime explicitly reports that Midjourney has no public API. |

### Video adapters

| Status       | Provider and models                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Available    | Google: Veo 3.1, Veo 3.1 Fast                                                                            |
| Available    | Kling: 2.5 Turbo, 2.1 Master                                                                             |
| Available    | Luma: Ray 3, Ray 2                                                                                       |
| Available    | MiniMax: Hailuo 2.3, Hailuo 02                                                                           |
| Available    | Pika: 2.2                                                                                                |
| Available    | Qwen: Wan 2.5 T2V, Wan 2.2 T2V Plus                                                                      |
| Available    | Runway: Gen-4 Turbo, Gen-3 Alpha Turbo                                                                   |
| Available    | xAI: Grok Imagine Video 1.5                                                                              |
| Catalog only | Midjourney Video v1 is selectable, but the runtime explicitly reports that Midjourney has no public API. |

### Audio adapters

| Status       | Provider and models                                               |
| ------------ | ----------------------------------------------------------------- |
| Available    | ElevenLabs: Eleven Music, ElevenLabs Sound Effects                |
| Available    | Stability AI: Stable Audio 2.5                                    |
| Catalog only | Google: Lyria 3 Pro Preview, Lyria 3 Clip Preview, Lyria Realtime |
| Catalog only | Kling Audio                                                       |
| Catalog only | MiniMax Music 2.6, Music Cover                                    |
| Catalog only | Suno v5.5, v4.5 All                                               |

The audio catalog presents all six providers, but only ElevenLabs and Stability AI currently have executable adapters.

### Unified media library

The Library settings screen lists agent-generated images, videos, and audio newest first in a grid:

- Images appear as thumbnails.
- Videos and audio are playable.
- Each item shows its filename and creation date.
- Right-click opens the type-specific native file menu.

The library currently has no search, filter, refresh, or delete toolbar.

## Chat and research providers

Provider routing uses the native Anthropic Messages API for Anthropic, the OpenAI Responses API for OpenAI, and the OpenAI-compatible Chat Completions path for every other chat provider.

| Provider                 | Current model catalog                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| Anthropic                | Claude Opus 4.7; Claude Sonnet 4.6; Claude Haiku 4.5                     |
| DeepSeek                 | DeepSeek V4 Pro; DeepSeek V4 Flash                                       |
| Google                   | Gemini 3.1 Pro Preview; Gemini 3.1 Flash Lite                            |
| Kimi                     | Kimi K2.6; Kimi K2.5; Kimi K2 Thinking                                   |
| MiniMax                  | MiniMax M2.7; MiniMax M2.5                                               |
| Mistral                  | Mistral Large 2512; Mistral Medium 3.5; Devstral 2512                    |
| OpenAI                   | GPT-5.6 Sol, Terra, Luna; GPT-5.5, 5.5 Pro; GPT-5.4, 5.4 Pro, Mini, Nano |
| Qwen                     | Qwen3.7 Max; Qwen3.6 Plus; Qwen3.6 Flash                                 |
| Reka                     | Reka Flash; Reka Edge 2603                                               |
| xAI                      | Grok 4.3; Grok Build 0.1                                                 |
| Z.ai                     | GLM-5.1; GLM-5; GLM-5 Turbo                                              |
| Perplexity research chat | Sonar Deep Research; Sonar Reasoning Pro; Sonar Pro; Sonar               |

The provider key manager includes 24 catalog entries: OpenAI, Anthropic, Google, xAI, Mistral, DeepSeek, Qwen, Kimi, Z.ai, MiniMax, ElevenLabs, Deepgram, Cartesia, Black Forest Labs, Midjourney, Kling, Runway, Luma, Stability AI, Ideogram, Pika, Suno, Reka, and Perplexity. Each entry includes capability labels and an external setup/documentation link.

Realtime-voice models are cataloged for Google, Luma, Qwen, and xAI, but there is no realtime-voice IPC or model execution service. Friday's current Voice API is text-to-speech, and Home's voice-conversation panel is not connected to these models.

## Messaging channels

Friday includes Telegram and Discord bot adapters. Enabled channels with tokens are started when the app becomes ready.

### Shared behavior

- Incoming direct, group/channel, and thread messages are normalized and routed to the agent.
- Replies target the originating chat, message, and thread when the platform supports it.
- Channel replies use their own configured chat provider and model.
- Long replies are split into platform-sized parts, and delivery receipts distinguish sent, partial, and failed delivery.
- `/start` returns a fixed connected greeting. Other slash-prefixed channel messages are ignored.
- All accepted Telegram and Discord messages currently share one fixed bot-session UUID.

### Access policies

- Disabled or tokenless channels reject input.
- Empty messages are ignored.
- Direct-message policy can be **Allowlist** (default), **Open**, **Pairing**, or **Deny**.
- Allowlist mode accepts only configured sender IDs.
- An optional group/channel list restricts accepted route IDs.
- **Pairing is partial:** the current policy always rejects with `pairing_required`; there is no code-generation or approval flow.

### Telegram

- Long polling with pending updates dropped at start.
- Connection, error, and disconnected status events.
- A 60-second health check and exponential reconnect delay from 2 to 60 seconds.
- In-memory duplicate-message protection.
- Reply splitting at 4,096 characters.
- Renderer IPC supports start, stop, and restart.

### Discord

- Guild, guild-message, direct-message, and message-content intents.
- Bot-authored messages are ignored.
- Threads and reply references are supported.
- discord.js handles reconnection.
- Reply splitting at 2,000 characters.

The Channels screen configures both adapters with enable state, token, DM policy, direct-sender allowlist, group/channel allowlist, and the reply provider/model. The current renderer displays live runtime status only for Telegram and labels Discord as “config only,” even though Discord is started by the main-process registry when enabled.

## Settings and desktop integration

### Navigation

- The Settings overview groups General, System, Providers, Agent, Skills, MCP, Tasks, Health, Transcribe, Voice, Image, Video, Audio, and Channels.
- Deep pages use breadcrumbs.
- `Cmd/Ctrl+F` opens a route and setting search palette.
- Unknown routes show a 404 recovery view; route failures show retry, restart, or Home actions.
- Page transitions respect the operating system's reduced-motion preference.

### Application preferences

- View application name and version.
- Enable or disable the tray/menu-bar icon.
- Keep the computer active by preventing app suspension while still allowing the display to sleep.
- Open the application-data folder.
- Select English or Italian.
- Select light, dark, or system theme; system mode follows OS theme changes.

### Media permissions and tests

- System pages are available for Microphone, Camera, and Screen capture.
- On macOS, Friday displays microphone/camera permission status, can request access, and opens the relevant System Settings pane.
- Screen capture opens its OS settings pane.
- Microphone can be recorded and played back.
- Camera and screen capture show a live preview, can record, stop, retry, and play the result.
- On non-macOS platforms, the explicit system permission status is reported as unknown and the current application-level microphone/camera toggle handlers do not disable capture.
- Display capture automatically chooses the first source returned by Electron; Friday does not present its own source picker.

### Window, tray, and native menus

- The primary launcher is a transparent, frameless 440×600 window that closes to the tray.
- macOS uses vibrancy and native traffic-light controls; Windows and Linux use custom window controls.
- The tray toggles visibility and provides localized Show/Hide and Quit actions.
- Native menus include New Window, standard editing commands, reload, window controls, English/Italian selection, developer console, and refresh.
- The app can open additional launcher windows.

## Privacy, storage, and security

### Local data

Friday stores configuration and working data below Electron's application-data directory:

| Area        | Stored data                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| App         | Tray, keep-awake, language, and theme settings.                                                                                             |
| Providers   | Provider name, API key, and base URL.                                                                                                       |
| Agent       | Active model, policy, MCP definitions and OAuth state, skills, schedules, health settings, workspace Markdown, sessions, and media library. |
| Channels    | Bot tokens, sender policies, and channel reply model.                                                                                       |
| Services    | Independent text, transcription, voice, image, video, and audio selections.                                                                 |
| Media       | Standalone generated video and audio files.                                                                                                 |
| Browser     | Persistent agent-browser profile.                                                                                                           |
| Diagnostics | Local rotating logs and crash dumps. Crash dumps are not uploaded by the current configuration.                                             |

Secrets are masked in the renderer after saving, but provider keys, bot tokens, and MCP secrets are stored in ordinary local electron-store files rather than an encrypted credential vault. Anyone with access to the user's application-data files may be able to read them.

Prompts, attachments, tool inputs, and generated content may be sent to configured model providers, MCP servers, websites, browser targets, Telegram, or Discord as required by the requested operation.

### Electron hardening

- Renderer windows use Electron sandboxing, context isolation, disabled Node integration, web security, and insecure-content blocking.
- Production navigation is restricted to local `file://` content.
- Renderer capabilities are exposed through typed preload APIs rather than direct Node access.
- Media permission requests are limited to trusted app windows and renderer origins.
- Native media context menus validate that files are inside the agent or media data roots.

Known boundaries:

- The `window.open` denial handler is currently commented out.
- The external-URL IPC path does not validate schemes before passing a URL to Electron.
- Provider secrets can be read by trusted renderer code through the provider preload API.
- The local-resource protocol confines `local-resource://agent/...`, while other host/path forms are less restricted.
- Friday does not claim formal certification for regulated data.

## Platform and packaging

- Windows: NSIS installer for x64, selectable installation directory, desktop shortcut, and retained app data on uninstall.
- macOS: PKG and DMG targets for x64 and arm64, dark-mode support, hardened runtime, and microphone/camera entitlements.
- Linux: AppImage script and AppImage/DEB builder configuration.
- English and Italian translation catalogs and a locale selector are present, but localization is partial: major first-run and Home copy, including suggestions and the editor placeholder, remains hardcoded in English. The Windows installer additionally declares Italian, English, Spanish, French, and German installer languages.

## Source map

The main implementation areas behind this reference are:

- [Chat and renderer UI](../src/renderer/src/pages/home/)
- [Settings pages](../src/renderer/src/pages/settings/)
- [Agent runtime and tools](../src/main/agent/)
- [Provider catalog and models](../src/shared/provider_models_definitions.ts)
- [Provider metadata](../src/shared/providers_definitions.ts)
- [Speech-to-text adapters](../src/main/models/stt/)
- [Text-to-speech adapters](../src/main/models/tts/)
- [Image adapters](../src/main/models/tti/)
- [Video adapters](../src/main/models/ttv/)
- [Audio adapters](../src/main/models/tta/)
- [Messaging channels](../src/main/channels/)
- [Desktop application services](../src/main/app/)
- [Security policy](../SECURITY.md)

Feature claims in this document intentionally exclude unmounted demo components, legacy translation strings without a current route, the disabled tray “Apps” placeholder, inactive browser-style navigation controls, and package manifest entries that do not have a corresponding current implementation.
