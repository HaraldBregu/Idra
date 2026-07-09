# Friday

**Your desktop AI copilot for everyday tasks.**

Friday is an Electron desktop app for AI-assisted workflows. You chat with it in plain language (typed or spoken, with image and PDF attachments) and it gets real work done: it reads and writes files, runs commands, searches the web, generates images, transcribes your voice, speaks back, runs on a schedule, and connects to the tools and messaging apps you already use.

You bring your own AI provider keys, your data and credentials stay local, and every action that touches your files, accounts, or the outside world passes through explicit permission checks.

See [docs/overview.md](docs/overview.md) for the full feature tour.

## Features

- **Agent chat with tools** — file read/write/edit, patches, shell commands, web search/fetch, browser automation, image generation, subagents, and streamed responses with transparent tool activity.
- **Attachments** — send images and PDFs alongside your prompt.
- **Bring your own AI** — provider adapters normalize many vendors (including OpenAI-compatible endpoints) behind one interface; pick a provider + model per capability (assistant, speech-to-text, text-to-speech, text-to-image).
- **Voice** — real-time dictation (speech-to-text) and read-aloud replies (text-to-speech).
- **Skills** — reusable packaged workflows, auto-discovered per request, with declared tool/connector limits.
- **Connectors** — Google (Gmail, Calendar, Drive), Microsoft (Outlook, SharePoint, Teams), Dropbox.
- **MCP servers** — connect remote (HTTP) or local (stdio) Model Context Protocol tool servers.
- **Channels** — chat with Friday from messaging platforms (Telegram live today; catalog entries for Slack, Discord, WhatsApp, Signal, Matrix, Teams, and more).
- **Task scheduler & health checks** — recurring cron jobs and periodic checklist-driven health runs.
- **Memory & personalization** — durable memory, user profile, and a local workspace.
- **Platforms & languages** — Windows, macOS (x64 and arm64), Linux; English and Italian UI; light/dark/system themes.

## Project Context

- Project type: desktop app
- Runtime: Electron, Node.js
- UI: React, Tailwind CSS, shadcn-style components
- Main language: TypeScript
- Testing: Jest, Testing Library, Playwright
- Packaging: electron-vite, electron-builder
- Sensitive data: AI provider API keys, connector credentials, agent history, local workspace data, channel configuration
- Current compliance target: no formal regulated-data certification claimed

## Development

Requirements: Node.js 22+, Yarn 4 (via Corepack).

```bash
yarn install --frozen-lockfile
yarn dev
```

Use the Linux variants when running in a Linux environment that requires Electron sandbox changes:

```bash
yarn dev-linux
```

## Quality Gates

Run the same baseline expected in CI before merging:

```bash
yarn quality:check
```

Focused commands:

```bash
yarn typecheck
yarn lint
yarn test:main
yarn test:renderer
yarn test:e2e
```

## Building & Packaging

```bash
yarn build                # typecheck + production build
yarn dist:win             # Windows x64 installer
yarn dist:mac             # macOS pkg (x64 + arm64)
yarn dist:mac:dmg         # macOS dmg (x64 + arm64)
yarn dist:linux:appimage  # Linux AppImage
```

## Architecture Notes

- Main-process services live under `src/main` (agent, channels, providers, image, voice, transcribe, IPC, app services).
- Renderer code lives under `src/renderer/src`.
- Cross-process API contracts live under `src/shared` and `src/preload`.
- Agent runs are streamed (`src/main/agent/run`), with sessions, tools, skills, cron, health, sandbox, and permission policy as sibling modules.
- Browser windows should be created through `WindowFactory` so Electron security defaults stay consistent.
- Provider-specific AI logic should stay behind provider adapters, not leak into agent or UI code.

## Security Baseline

- Renderer windows use sandboxing, context isolation, disabled Node integration, and web security.
- Preload APIs should expose narrow typed IPC methods only.
- Secrets must not be committed, logged, rendered, or stored in plaintext where avoidable.
- Connector and tool actions that write, delete, publish, or access private data must pass explicit permission checks.

See [SECURITY.md](SECURITY.md) for the security policy and how to report vulnerabilities.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, and code standards. Behavioral guidelines for AI-assisted contributions are in [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE) © 2026 Harald Bregu
