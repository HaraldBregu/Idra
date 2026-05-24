# Multiplatform Desktop Application

Friday is an Electron desktop application with a TypeScript main process, typed preload IPC, and a React renderer.

## Functionality

- Secure Electron browser windows with context isolation, sandboxing, disabled Node integration, and web security.
- React settings and home/chat UI.
- Typed IPC modules by domain.
- App menu, tray behavior, window controls, and global shortcuts.
- User-data and workspace directory management.
- Power-save blocker support for keeping the app awake.
- System permission and capability settings for microphone, camera, screen recording, accessibility, files, network, notifications, clipboard, hardware, and related OS surfaces.
- Runtime logs and renderer-visible app log buffers.
- Settings pages for providers, skills, connectors, channels, heartbeat, cron, background tasks, and system capabilities.

## Platform Targets

The package scripts and Electron Builder config support:

- macOS packages and DMGs for x64 and arm64.
- Windows x64 builds.
- Linux AppImage builds.

Development runs through `electron-vite`; production builds run typecheck and package through Electron Builder.

## Source

- `src/main/main.ts`
- `src/main/bootstrap.ts`
- `src/main/core/window-factory.ts`
- `src/main/menu.ts`
- `src/main/tray.ts`
- `src/preload`
- `src/renderer/src`
- `package.json`
- Existing docs: `README.md`, `docs/modules.md`, `docs/system/index.md`

