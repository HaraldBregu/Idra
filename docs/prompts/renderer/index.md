# Renderer Prompts

Prompts for creating pages in the renderer.

Each page prompt describes the purpose, structure, and behavioral expectations for a single page in the app. Use these prompts to implement new pages or to understand what an existing page must do.

## Pages

- [start.md](start.md) — Onboarding flow that runs the first time the user opens the app.
- [home.md](home.md) — Main conversation page where the user interacts with the Friday agent.
- [settings.md](settings.md) — Settings layout and its nested pages for configuring the app.

## Conventions

- Each page lives in its own folder under the pages directory.
- Each page has a single entry point component.
- Pages use `PageContainer` as their outermost layout wrapper.
- Pages must not import from other pages. Shared UI primitives live in the shared components directory.
- Page-scoped components, hooks, and context stay inside the page folder and are not exported outside it.
- Shared types or utilities that multiple pages need go in the shared directory.

## Types

Place types in the narrowest scope that satisfies all their consumers:

| Consumers | Where to define the type |
|---|---|
| Both **main process and renderer** | `src/shared/types/` |
| **Multiple renderer pages** or shared renderer utilities | `src/renderer/src/types/` |
| **Single page** only | Inside that page's folder (e.g. `src/renderer/src/pages/home/types.ts`) |

Rules:
- Never duplicate a type. If the same shape is needed in two places, move it to the appropriate shared location.
- Do not import renderer-only types from `src/shared/` — that layer must stay process-agnostic.
- Do not import page-scoped types outside that page's folder. Promote the type if it grows beyond one page.
- Prefer named exports over default exports for types so they are easy to tree-shake and re-export selectively.

## Logging

The renderer has no custom logger library. Use `console.error` for errors and `console.warn` for recoverable warnings. Do not use `console.log` or `console.debug` in production code.

Format: `console.error('[Source] description:', error)` where `Source` is the component or hook name in PascalCase brackets.

Examples:
```ts
console.error('[ChannelsPage] Failed to load channel catalog:', error);
console.error('[useProviderSetup] Failed to save API key:', error);
console.warn('[ModelServiceStep] No models returned for provider:', providerId);
```

Log only at failure boundaries — unexpected thrown errors and unrecoverable async failures. Do not log normal control flow, empty states, or successful operations.
