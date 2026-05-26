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
