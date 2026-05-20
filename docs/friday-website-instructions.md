# Friday Website Instructions

Use this brief to create a product website that presents Friday as a local-first desktop AI copilot and clearly explains every major application capability.

## Objective

Create a polished website for Friday that helps visitors understand what the app is, what it can do, why it is useful, and how it handles user data. The site should present Friday as a practical desktop AI assistant for everyday work, software projects, writing, connected apps, scheduled automation, voice input, and messaging workflows.

## Product Summary

Friday is an Electron desktop application for AI-assisted workflows. It combines a React desktop interface, configurable AI providers, local app state, typed IPC, connectors, skills, scheduled jobs, external messaging channels, and privacy-conscious local controls.

Primary positioning:

> Friday is your desktop AI copilot for everyday tasks: chat, plan, write, inspect files, use tools, connect services, schedule work, and stay in sync across channels from a local-first desktop app.

## Target Audience

- Developers who want an AI assistant that can inspect code, run tools, and work inside a local workspace.
- Operators and knowledge workers who want connected-app workflows, scheduled checks, and assistant-driven task automation.
- Writers and creators who want AI help for drafting, editing, brainstorming, and structured workflows.
- Power users who care about provider choice, local control, permissions, and transparent automation.

## Messaging Principles

- Be concrete and product-led. Show the actual assistant, settings, channels, providers, skills, and automation features.
- Avoid vague AI hype. Explain what Friday can do in user-facing language.
- Emphasize local-first control, configurable providers, explicit permissions, and visible history/settings.
- Be honest about feature maturity. Image assistant settings are present, but image provider configuration is not available yet.
- Present Friday as calm, practical, and precise.

## Required Site Structure

### 1. Hero

Purpose: Make the product immediately recognizable.

Required content:

- Headline: "Friday"
- Supporting copy: "A local-first desktop AI copilot for chat, tools, connected apps, scheduled tasks, and voice-assisted workflows."
- Primary CTA: "Get Friday" or "Download Friday"
- Secondary CTA: "View features"
- First-viewport visual: a realistic app screenshot or composed product mockup showing the chat screen with prompt input, tool activity, and settings/navigation hints.

Do not use a generic abstract AI illustration as the main visual. The product interface must be visible.

### 2. Core Assistant

Explain the main chat experience.

Include:

- Conversation with Friday as the main assistant.
- Prompt suggestions for onboarding and first tasks.
- Text prompts, attached files, and audio attachments.
- Streaming assistant responses.
- Visible agent states such as thinking, reasoning, using tools, waiting for approval, answering, completed, cancelled, and error.
- Tool activity display with tool call start, input, result, status, duration, and error states.
- Stored chat history with message counts, user/assistant/tool breakdown, approximate context size, refresh, and delete controls.

Suggested section headline:

> Work with an assistant that can talk, inspect, and act

### 3. Tool Use and Workspace Actions

Explain that Friday exposes tools only when useful and keeps actions governed.

Include supported tool categories:

- File reading, writing, editing, patching, copying, moving, deleting, and inspection.
- Workspace search.
- Shell command execution for tests, builds, scripts, and terminal tasks.
- Process inspection/stopping for commands started by Friday.
- Web fetching for current documentation or web data.
- Browser opening and managed browser control.
- Cron task management.
- Skill execution when a selected skill matches the task.
- Connector, plugin, MCP, LSP, and client-hosted tools when configured.

Mention that tool selection is policy-driven and scoped per turn.

### 4. Providers and Models

Explain provider choice and API key management.

Include:

- Local provider API key setup and editing.
- Keys remain in Friday's local app data and are used only for provider calls.
- Main assistant model selection.
- OpenAI reasoning effort options: none, minimal, low, medium, high, extra high.
- Speech-to-text provider/model selection.
- Text-to-speech voice model display.
- Image assistant placeholder state until image providers are configurable.

Show provider coverage categories:

- Chat
- Speech-to-text
- Text-to-speech
- Realtime voice
- Image
- Video
- Audio
- Music
- Research chat
- 3D and omni-capable providers where available

Mention provider examples such as OpenAI, Anthropic, Google, Meta, xAI, Mistral, Cohere, DeepSeek, Qwen, Kimi, Z.ai, Baidu, Tencent Hunyuan, ByteDance Seed, MiniMax, ElevenLabs, Deepgram, Cartesia, Black Forest Labs, Midjourney, Adobe Firefly, Kling, Runway, Luma AI, Stability AI, Ideogram, Pika, Suno, Reka, AI21, Perplexity, and NVIDIA.

### 5. Voice and Audio

Explain microphone-driven workflows.

Include:

- Microphone permission controls.
- Live dictation into chat through GPT Realtime Whisper.
- Audio recording from the prompt input.
- Audio file attachments with preview/duration display.
- Text-to-speech agent configuration with ElevenLabs Rachel multilingual voice.
- Clear blocked/restricted/unknown/unsupported permission states.

### 6. Connectors

Explain connected-app tooling.

Include:

- OpenAI-maintained connector setup for Responses API tool use.
- Add, update, enable, disable, and inspect connectors.
- Connector name, connector type, server label, description, authorization, scopes, tools, and setup instructions.
- Google OAuth connector flow using app environment credentials.
- OAuth access token connector flow for other connectors.
- Approval policy options: always require approval, skip approval for allowed tools, or never require approval.
- Allowed tools list, including the option to allow all available tools.
- Deferred tool loading.
- Connector status messaging and OAuth connection action.

Also include connector platform discovery:

- Composio
- Pipedream Connect
- Zapier
- Nango
- Merge Agent Handler
- Workato
- Tray.ai
- Boomi
- MuleSoft Anypoint Platform

Position this as extensible connected-app infrastructure, not as a guarantee that every platform is fully bundled.

### 7. Skills

Explain skill-based workflow extension.

Include:

- Import local skills from folders containing `SKILL.md`.
- Support for common Agent Skills folder structures.
- Refresh installed skills.
- Inspect skill details: id, format, version, category, safety, visibility, author, tools, connectors, tags, model visibility, folder, skill file, and diagnostics.
- Download and delete skill actions when available.
- Skills are instructions and optional tool-contract hints; they do not grant permissions or bypass runtime policy.

Mention example use cases:

- Research briefs
- Data quality checks
- Release note drafting
- Team-specific workflow instructions

### 8. Apps and Plugins

Explain installed app/plugin support.

Include:

- List installed apps.
- Show app icon, name, and version.
- Refresh app list.
- Open app folder.
- Delete installed apps.
- Apps are stored under user-owned Friday data.

### 9. Messaging Channels

Explain that Friday can receive and send messages through channel adapters.

Include the channel catalog:

- ClickClack
- Discord
- Feishu/Lark
- Google Chat
- iMessage
- IRC
- LINE
- Matrix
- Mattermost
- Microsoft Teams
- Nextcloud Talk
- Nostr
- QQ Bot
- Signal
- Slack
- Synology Chat
- Telegram
- Tlon
- Twitch
- WhatsApp
- Zalo
- Zalo Personal

Clarify maturity:

- Telegram has the bundled runtime implementation.
- Other channels appear as setup/catalog surfaces unless a runtime is added.

For channel settings, include:

- Enable/disable channel.
- Account label.
- Bot token or platform token.
- Phone number for phone-based channels.
- Server URL for server/workspace channels.
- Webhook URL.
- Default target.
- Direct message policy: allowlist, pairing, open, or deny.
- Allowed sender lists for direct messages and groups.
- Runtime status.
- Telegram start, reconnect, and stop actions.

### 10. Scheduled Tasks

Explain cron and scheduled work.

Include:

- List scheduled tasks.
- Enabled/disabled state.
- Schedule display.
- Next run and last run information.
- Details page with id, schedule, target, delivery, timestamps, prompt, and payload.
- Delete scheduled tasks.
- Cron tooling can create, list, update, remove, manually run, or wake scheduled jobs when exposed to an agent turn.

### 11. Heartbeat

Explain periodic agent checks.

Include:

- Heartbeat runtime enable/pause control.
- Runner active/idle status.
- Configured agent count.
- Next due time.
- Timing controls with duration presets such as 5m, 15m, 30m, 1h, and disable.
- Optional active hours with start, end, and timezone.
- Last event status, timestamp, duration, channel, reason, and preview.
- Manual wake-now action.
- System event input that can be sent immediately or queued for the next heartbeat.

Position this as a way for Friday to keep periodic awareness and run controlled checks.

### 12. Privacy, Data, and Control

This section is mandatory.

Include:

- Friday is local-first but can connect to external AI providers, channels, apps, and connectors.
- API keys, tokens, passwords, private keys, and credentials are secrets and should not be logged or exposed.
- Provider keys are stored locally and only used for provider calls.
- Chat history, workspace paths, channel IDs, connector metadata, local files, and agent data are treated as private.
- Users can inspect chat history size and clear the active conversation history.
- Application data and user data folders can be opened from settings.
- App settings include theme, language, translucency, menu bar visibility, keep-awake behavior, and microphone control.
- Tool and connector actions that write, delete, publish, or access private data should pass permission checks.

### 13. Desktop Experience

Explain platform/app features.

Include:

- Electron desktop app.
- Tray/menu bar support with show, hide, and quit.
- Theme modes: light, dark, and system.
- Translucency controls for light and dark themes.
- Language support: English and Italian.
- Keep computer active toggle for background work.
- Access to app data and user data folders.
- Navigation through settings sections and command/search surfaces.
- Error boundaries, loading states, empty states, and status notices.

### 14. Technical Foundation

Add a concise technical section for technical visitors.

Include:

- Electron, Node.js, TypeScript, React, Tailwind CSS, and shadcn-style components.
- Main-process services under `src/main`.
- Renderer code under `src/renderer/src`.
- Cross-process API contracts under `src/shared` and `src/preload`.
- Provider adapters behind a provider abstraction.
- Local stores for app settings, cron schedules, skills, apps, channels, memory, and session state.
- Testing with Jest, Testing Library, and Playwright.
- Packaging with electron-vite and electron-builder.

## Navigation Requirements

Recommended top navigation:

- Product
- Features
- Integrations
- Automation
- Privacy
- Technical
- Download

Recommended page anchors:

- `#assistant`
- `#tools`
- `#providers`
- `#voice`
- `#connectors`
- `#skills`
- `#channels`
- `#automation`
- `#privacy`
- `#technical`

## Visual Direction

- Use the actual Friday brand name prominently.
- Build the first screen around a realistic product screenshot or mockup.
- Use compact, desktop-app-inspired panels for feature details.
- Favor calm, utilitarian visuals over decorative AI imagery.
- Show UI states such as chat, settings, providers, connectors, channels, cron, and heartbeat.
- Use icons for feature cards, but do not rely on icons alone.
- Keep typography clear and dense enough for a professional desktop tool.
- Include both light and dark mode examples if assets are available.

## Required Functionality Checklist

The website must mention all of the following:

- Main Friday assistant
- Text chat
- Prompt suggestions
- File attachments
- Audio attachments
- Microphone dictation
- Speech-to-text
- Text-to-speech
- Image assistant placeholder
- Tool use
- Tool policy and per-turn tool selection
- File and workspace operations
- Shell command execution
- Web fetch
- Browser control
- Approval and pending input states
- Provider setup
- Provider API keys
- Model selection
- Reasoning effort
- Connectors
- Connector OAuth/token setup
- Connector allowed tools
- Connector approval policies
- Connector platform discovery
- Skills import and inspection
- Apps list/open/delete
- Messaging channel catalog
- Telegram runtime
- Channel allowlists and DM policies
- Cron task list/details/delete
- Heartbeat runtime/timing/manual events
- Chat history statistics and deletion
- App data and user data folder controls
- Theme, language, translucency, menu bar, keep-awake, and microphone settings
- Local-first privacy and secret handling
- Electron/React/TypeScript technical foundation

## Copy Constraints

- Do not claim cloud sync, regulated compliance, enterprise certification, or production-grade guarantees unless separately implemented and documented.
- Do not claim all cataloged channels have active runtimes. Telegram is the current bundled runtime.
- Do not claim image creation is configurable yet. Say the image assistant is prepared for future image provider support.
- Do not expose or include sample real API keys, tokens, user paths, channel IDs, or connector credentials.
- Do not imply Friday bypasses user permissions or system security.

## Suggested Calls to Action

- "Download Friday"
- "Explore features"
- "Connect your providers"
- "Automate a workflow"
- "Read the privacy notes"

## Suggested Metadata

- Title: "Friday - Desktop AI Copilot"
- Description: "Friday is a local-first desktop AI copilot for chat, tools, connected apps, scheduled tasks, messaging channels, and voice-assisted workflows."
- Open Graph title: "Friday"
- Open Graph description: "A practical desktop AI assistant with provider choice, local controls, tools, connectors, skills, cron tasks, channels, and heartbeat automation."

## Delivery Expectations

The finished website should make a new visitor understand Friday within the first screen, then progressively reveal deeper functionality without overwhelming them. The final result should feel like a real product website for a serious desktop application, not a generic AI landing page.
