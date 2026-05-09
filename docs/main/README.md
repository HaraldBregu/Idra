# Main Process

Electron main process. Source: `src/main/`.

## Modules

- [assistant/](./assistant/README.md) — conversational AI assistant
- `bootstrap.ts` — app boot sequence
- `channels/` — chat channel adapters (Discord, Telegram, WhatsApp)
- `core/` — core services
- `cron/` — scheduled task runner
- `i18n.ts` — i18n setup
- `index.ts` — main entry
- `ipc/` — IPC handlers
- `logger/` — logging
- `menu.ts` — app menu
- `shared/` — shared utils
- `shortcuts.ts` — global shortcuts
- `store/` — persistent settings store
- `task/` — task subsystem
- `theme/` — theme handling
- `tray.ts` — tray icon
- `workspace/` — workspace management

Only `assistant/` is documented today. Add more module pages as needed.
