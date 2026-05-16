# Friday

Friday is an Electron desktop app for AI-assisted workflows. It uses a TypeScript main process, a React renderer, typed preload IPC, provider adapters, connectors, skills, scheduled jobs, and local application state.

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
```

## Architecture Notes

- Main-process services live under `src/main`.
- Renderer code lives under `src/renderer/src`.
- Cross-process API contracts live under `src/shared` and `src/preload`.
- Browser windows should be created through `WindowFactory` so Electron security defaults stay consistent.
- Provider-specific AI logic should stay behind provider adapters, not leak into agent or UI code.

## Security Baseline

- Renderer windows use sandboxing, context isolation, disabled Node integration, and web security.
- Preload APIs should expose narrow typed IPC methods only.
- Secrets must not be committed, logged, rendered, or stored in plaintext where avoidable.
- Connector and tool actions that write, delete, publish, or access private data must pass explicit permission checks.

See [SECURITY.md](SECURITY.md) and [docs/privacy-and-data.md](docs/privacy-and-data.md) for operational standards.

## Professional Standards

The implementation checklist for code quality, security, accessibility, performance, reliability, API design, documentation, DevOps, privacy, UX, and maintainability is in [docs/software-standards.md](docs/software-standards.md).
