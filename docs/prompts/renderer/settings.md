# Settings Page Prompt

Create the settings page as a layout shell with nested sub-pages.

The settings page is a multi-section configuration area. It uses a shared `Layout` that wraps all nested routes via an `Outlet`, and an `OverviewPage` that acts as the entry point listing all available settings groups.

## Layout

`Layout` wraps every settings sub-page:

- A sticky `SettingsBreadcrumbHeader` at the top renders a breadcrumb trail: a Settings icon, a link back to `/settings`, and any nested route labels derived from `useSettingsBreadcrumbItems`.
- A scrollable `<main>` renders the current sub-page via `<Outlet />` with consistent horizontal padding.
- A fixed footer shows a platform label (e.g. "macOS") right-aligned.

## Overview page

`OverviewPage` is the default route at `/settings`. It renders a page header with the settings title and description, then groups all settings items into labeled sections.

Groups:

| Group | Label key | Contents |
|---|---|---|
| `app` | `settings.overview.groups.app` | General, System |
| `ai` | `settings.overview.groups.ai` | Agent operator items (Assistant, Speech-to-text, Text-to-speech, Text-to-image, Text-to-video, Text-to-audio) + Providers, Skills, Connectors |
| `channels` | `settings.overview.groups.channels` | Channels |
| `automation` | `settings.overview.groups.automation` | Heartbeat, Cron |
| `monitoring` | `settings.overview.groups.monitoring` | Task Manager, Monitoring, Policies |

Each item renders as a `SettingsOverviewCard`: an `Item` button that navigates to the item's path. Items marked `comingSoon` are disabled and show a "Soon" badge instead of the chevron.

## Shared components

Settings sub-pages use a set of shared layout components:

- `SettingsPageShell` — outer wrapper for a settings sub-page.
- `SettingsPageHeader` — renders a `title` and optional `description` at the top of a sub-page.
- `SettingsSection` — a labeled section grouping one or more panels.
- `SettingsPanel` — a bordered card that wraps a list of setting items.

## Navigation

All settings routes are defined in `SETTINGS_NAVIGATION`. Agent operator routes are defined in `SETTINGS_OPERATOR_ITEMS`. Both lists drive the overview cards and breadcrumb resolution.

## Sub-pages

Each sub-page follows the same pattern:

- Use `SettingsPageShell`, `SettingsPageHeader`, `SettingsSection`, and `SettingsPanel` for layout.
- Fetch and mutate data through the appropriate service via IPC — do not call backend services directly from the renderer.
- Use `useTranslation` for all user-visible strings.

Current sub-pages: General, System, Providers, Skills, Connectors (with detail), Channels (with detail), Operators (with detail and chat history detail), Heartbeat, Cron (with detail), Task Manager (with detail), Monitoring, Policies.

## Types

Follow the type placement rules in the renderer conventions.

- Types that cross the IPC boundary (e.g. provider config shapes, operator records) belong in the shared types directory.
- Types consumed by multiple renderer pages belong in the renderer-level types directory.
- Types scoped to the settings page alone — navigation item shapes, breadcrumb state, overview group definitions — stay inside the settings page folder.

## Logging

Use `console.error` for unexpected async failures in sub-pages. Do not use `console.log` or `console.debug`. See the renderer logging convention in the renderer conventions.

Each sub-page that loads data via IPC must log failures at the catch boundary. Use the page component name as the source tag.

Examples:

```ts
// In a data-loading effect inside a sub-page
console.error('[ChannelsPage] Failed to load channel catalog:', error);
console.error('[ProvidersPage] Failed to load providers:', error);
console.error('[ConnectorsPage] Failed to load connectors:', error);
```

Mutation failures (save, delete, enable, disable) follow the same pattern:

```ts
console.error('[ChannelDetailPage] Failed to save channel config:', error);
console.error('[ConnectorDetailPage] Failed to remove connector:', error);
```

Do not log breadcrumb resolution, navigation events, or successful data loads.

## Testing

Test breadcrumb rendering for nested routes, overview group rendering, `comingSoon` item behavior, navigation on card click, and that the `Outlet` renders sub-page content. Tests call layout and page components; they do not import internal navigation constants directly.
