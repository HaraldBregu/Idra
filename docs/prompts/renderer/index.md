# Renderer Prompts

Prompts for creating pages in the renderer (`src/renderer/src/pages/`).

Each page prompt describes the purpose, structure, and behavioral expectations for a single page in the app. Use these prompts to implement new pages or to understand what an existing page must do.

## Pages

- [start.md](start.md) — Onboarding flow that runs the first time the user opens the app.
- [home.md](home.md) — Main conversation page where the user interacts with the Friday agent.
- [settings.md](settings.md) — Settings layout and its nested pages for configuring the app.

## Conventions

- Each page lives under `src/renderer/src/pages/<name>/`.
- The entry point for a page is `Page.tsx` (or `StartPage.tsx` for the start page).
- Pages use `PageContainer` from `@/components/app/base/page` as their outermost layout wrapper.
- Pages must not import from other pages. Shared UI primitives live in `@/components/ui/`.
- Page-scoped components, hooks, and context stay inside the page folder and are not exported outside it.
- Shared types or utilities that multiple pages need go under `src/shared/`.

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
