<p align="center">
  <img src="resources/icons/icon-rounded.png" alt="Friday logo" width="144" />
</p>

<h1 align="center">Friday</h1>

<p align="center">
  <strong>Your desktop AI copilot for everyday tasks.</strong>
</p>

Friday is a cross-platform desktop AI assistant that turns conversations into actions. Type or speak a request, attach images or PDFs, and let the agent work with files, run commands, research the web, create media, or automate a recurring task.

You choose the providers and models behind each AI capability. Friday keeps its settings, provider keys, conversations, and workspace data on your machine, while requests are sent only to the AI providers and connected services you configure.

## What Friday Can Do

- **Work with your computer** — read, create, and edit files; apply precise patches; and run commands or long-lived processes.
- **Understand more than text** — accept image and PDF attachments, transcribe speech, and read responses aloud.
- **Research and browse** — search the web, fetch pages, and automate browser interactions when a task requires them.
- **Create media** — generate images, videos, music, and sound effects with your selected providers and models.
- **Use your preferred AI providers** — configure your own API keys and select models separately for chat, speech, image, video, and audio.
- **Extend the agent** — import reusable skills, connect remote HTTP or local stdio MCP servers, and delegate independent work to subagents.
- **Automate routines** — create recurring schedules and periodic checklist-based health runs.
- **Remember useful context** — maintain durable memory, personalization files, conversation history, and a local working directory.
- **Chat from other apps** — connect Telegram or Discord channels to reach Friday away from the desktop app.

Friday runs on Windows, macOS, and Linux, with English and Italian interfaces and light, dark, and system themes.

## Control and Privacy

- Provider API keys and Friday's application data are stored locally.
- Prompts, attachments, and tool data may be sent to the providers, MCP servers, websites, or messaging channels you configure.
- File writes, edits, patches, and command execution are governed by the agent permission policy.
- Tool activity is streamed into the conversation so you can follow what the agent is doing.
- Friday does not claim formal certification for regulated data.

## Technology

- Electron 41 and Node.js
- React 19, TypeScript, Tailwind CSS 4, and shadcn components
- Jest, Testing Library, and Playwright
- electron-vite and electron-builder

## Getting Started

Requirements: Node.js 22+ (npm is included with Node.js).

```bash
npm ci
npm run dev
```

On first launch, add an API key under **Settings → Providers**, then select the provider and model for the assistant. Configure speech and media models only for the capabilities you plan to use.

For Linux environments that require Electron sandbox changes, run:

```bash
npm run dev-linux
```

## Quality Checks

Run the main local checks before submitting changes:

```bash
npm run quality:check
```

This runs the TypeScript checks, ESLint, main-process tests, and renderer tests. Run the end-to-end suite separately:

```bash
npm run test:e2e
```

## Build and Package

```bash
npm run build                # Type-check and create a production build
npm run dist:win             # Windows x64 installer
npm run dist:mac             # macOS package for x64 and arm64
npm run dist:mac:dmg         # macOS DMG for x64 and arm64
npm run dist:linux:appimage  # Linux AppImage
```

## Project Structure

- `src/main` contains the Electron main process, agent runtime, channels, model integrations, media services, transcription, IPC, and application services.
- `src/renderer/src` contains the React user interface.
- `src/preload` exposes the narrow bridge between the renderer and main process.
- `src/shared` contains cross-process types and API contracts.
- `src/main/agent` contains sessions, tools, skills, memory, schedules, health runs, sandboxing, and permission policy.
- `src/main/models` contains provider-specific model integrations.

## Security

Renderer windows use sandboxing, context isolation, disabled Node integration, and web security. Preload APIs expose narrow typed IPC methods, and agent writes, edits, patches, and command execution are subject to the permission policy.

See [SECURITY.md](SECURITY.md) for the security policy and vulnerability reporting process.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, and code standards. Behavioral guidelines for AI-assisted contributions are in [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE) © 2026 Harald Bregu
