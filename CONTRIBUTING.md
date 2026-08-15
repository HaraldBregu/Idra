# Contributing to Idra

## Setup

Requirements: Node.js 22.14+ and npm 11.5.1+.

```bash
npm ci
npm run dev
```

## Project layout

- `src/agent` — agent runtime, tools, sessions, permissions, and system prompts
- `src/server` — application entrypoint and Fastify REST routes
- `src/shared` — cross-cutting utilities and types
- `src/ui` — user interface modules
- `tests` — automated tests
- `resources/templates` — agent workspace templates

## Quality checks

```bash
npm run typecheck
npm run build
npm run format:check
```

Never commit credentials or environment files. Keep changes focused and follow [AGENTS.md](AGENTS.md).
