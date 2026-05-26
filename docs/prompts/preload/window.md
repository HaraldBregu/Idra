# WindowApi Preload Prompt

Expose window controls through `window.win`. This API is the renderer-safe bridge to Electron window operations; it must not expose window instances, web contents, menus, or raw IPC.

## Expose

- Minimize the current window.
- Toggle maximize state for the current window.
- Close the current window.
- Show the application menu as a popup for the current window.
- Read the current maximize state.
- Read the current fullscreen state.
- Subscribe to maximize state changes.
- Subscribe to fullscreen state changes.

## Dependencies

- Typed window send channels for fire-and-forget actions.
- Typed window invoke channels for state queries.
- Typed window event channels for state subscriptions.
- A main-process handler that resolves the target window from the sender.
- Main-process window event broadcasting.
- Main-process access to Electron window and menu capabilities.

## Rules

- Use send-style calls for fire-and-forget window actions.
- Use invoke-style calls for state queries.
- Use subscription-style calls for state changes.
- Return unsubscribe functions from state subscriptions.
- Resolve the target window in the main process.
- Keep Electron-only objects and menu behavior in the main process.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run renderer checks when renderer consumers change.
- Manually smoke test window controls when Electron window behavior changes.
