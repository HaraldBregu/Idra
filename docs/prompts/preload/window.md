# WindowApi Preload Prompt

Expose window controls through `window.win`. `WindowApi` is the renderer-safe bridge to Electron window operations; it must not expose `BrowserWindow`, `webContents`, Electron menus, or raw IPC.

## Expose

- `minimize()`: minimize the current window.
- `maximize()`: toggle maximize state for the current window.
- `close()`: close the current window.
- `popupMenu()`: show the application menu as a popup for the current window.
- `isMaximized()`: read the current maximize state.
- `isFullScreen()`: read the current fullscreen state.
- `onMaximizeChange(callback)`: subscribe to maximize state changes.
- `onFullScreenChange(callback)`: subscribe to fullscreen state changes.

## Dependencies

- Channels: `WindowChannels`, `WindowInvokeChannelMap`, `SendChannelMap`, and `WindowEventChannelMap` in `src/shared/ipc-channels/index.ts`.
- Preload interface: `WindowApi` in `src/preload/index.d.ts`.
- Preload implementation: `win` in `src/preload/index.ts`.
- Main IPC: `src/main/ipc/window-ipc.ts`.
- Main window event emitters: `src/main/main.ts`.
- Main dependencies: Electron `BrowserWindow`, `Menu`, and `logger`.

## Rules

- Use `typedSend` for fire-and-forget window actions.
- Use `typedInvokeUnwrap` for state queries.
- Use `typedOn` for state subscriptions and return the unsubscribe function.
- Resolve the target window from the sender in main IPC.
- Keep Electron-only objects and menu behavior in the main process.

## Verification

- Run `yarn typecheck:node` for shared, preload, or IPC type changes.
- Run `yarn typecheck:web` when renderer consumers change.
- Manually smoke test window controls when changing Electron window behavior.
