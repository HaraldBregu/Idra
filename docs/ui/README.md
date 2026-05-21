# Renderer UI

This directory documents the renderer UI under `src/renderer`.

The renderer is a React app mounted through `src/renderer/src/App.tsx` and
routed by `src/renderer/src/router.tsx`. The root route supplies the shared
window frame, title bar, command menu, route transitions, and chat mode context.

## Main Surfaces

| Surface | Route | Primary source | Purpose |
| --- | --- | --- | --- |
| Start page | `/start` | `src/renderer/src/pages/start/StartPage.tsx` | First-run setup before the user lands on Home. |
| Home page | `/home` | `src/renderer/src/pages/home/Page.tsx` | Chatbot UI for the main Friday assistant. |
| Settings | `/settings/*` | `src/renderer/src/pages/settings` | Ongoing configuration for providers, operators, channels, skills, connectors, automation, and system settings. |

The default route redirects to `/start`. The legacy `/config` route also
redirects to `/start`.

## Shared Shell

The root route renders:

- `TitleBar`, with `Set up Friday` on `/start` and the translated app title
  elsewhere.
- `PageTransition`, wrapping all route content.
- `CommandMenu`, available globally.
- `ChatModeContext`, used by Home to switch between typed chat and voice UI
  states.
- `ErrorBoundary` wrappers around root and lazy route boundaries.

## Related Docs

- [Start page](start-page.md)
- [Home page](home-page.md)
- [Settings and operators](settings-page.md)
