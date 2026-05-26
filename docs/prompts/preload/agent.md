# AgentApi Preload Prompt

Implement `AgentApi` as the renderer-facing bridge for agent interaction. Keep the preload layer thin: expose typed methods on `window.agent`, route every operation through typed IPC, and put behavior in main-process services.

Assumption: `AgentApi` means the interface in `src/preload/index.d.ts` and the `agent` object exposed from `src/preload/index.ts`.

## Scope

`window.agent` owns renderer-safe access to:

- Sending an agent message.
- Cancelling or resetting the active run.
- Reading agent history.
- Opening the history folder.
- Listing, reading, and writing agent workspace files.
- Subscribing to agent response events.

It must not own provider resolution, transcript persistence, startup-file validation, tool execution, or history-folder policy. Those dependencies must stay behind main-process services.

## Dependencies

Implement the API through this dependency chain:

1. `src/shared/agents/service.ts`: define request, response, event, and workspace-file types here when both main and renderer need them.
2. `src/shared/ipc-channels/index.ts`: add or update `AgentChannels`, `AgentInvokeChannelMap`, and `AgentEventChannelMap` entries. Do not use raw channel strings in preload or renderer code.
3. `src/preload/index.d.ts`: update `AgentApi` and the global `Window` shape.
4. `src/preload/index.ts`: add methods to the exported `agent` object. Use `typedInvokeUnwrap` for request/response operations and `typedOn` for subscriptions.
5. `src/main/ipc/agent-ipc.ts`: register `ipcMain.handle` with `wrapSimpleHandler`, resolve dependencies from `MainServiceContainer`, and delegate to a real service.
6. Renderer code: consume the API through `window.agent`; do not import Electron IPC or main-process modules.

Current main-process dependencies are:

- `agentService`: `send`, `reset`, `cancel`, and history access.
- `startupFiles`: workspace file listing, reads, and writes for `DEFAULT_AGENT_ID`.
- `userDataDirectory`: resolving the agent history storage path.
- `shell.openPath`: opening the history folder from the main process.
- `logger`: registration diagnostics.
- `eventBus`: broadcasting `AgentResponseEvent` data to the renderer through `AgentChannels.response`.

Add a new dependency only when a real main-process service owns the behavior. Do not create preload-only state or mock fallback behavior to make a method appear implemented.

## Implementation Rules

- The preload implementation must only translate typed API calls to typed IPC calls.
- Never expose `ipcRenderer`, `ipcMain`, raw channel names, or main-process service instances to the renderer.
- Keep shared types under `src/shared`; keep main-only implementation types out of preload.
- Put validation and filesystem safety in the main service or a shared validator, not in the preload bridge.
- Preserve the unsubscribe return value for event subscriptions.
- Keep `AgentApi` method names stable unless all renderer consumers are updated in the same change.
- When changing existing behavior, refactor the relevant service or IPC handler directly. Do not add compatibility shims or patch-style wrappers unless explicitly requested.

## Adding a Method

1. Confirm the behavior already exists in a main-process service, or implement that service behavior first.
2. Add shared request and result types only if the method crosses process boundaries.
3. Add the channel constant and typed channel-map entry in `src/shared/ipc-channels/index.ts`.
4. Add the method signature to `AgentApi` in `src/preload/index.d.ts`.
5. Add the preload method in `src/preload/index.ts` using the typed IPC helper that matches the behavior.
6. Add the `AgentIpc` handler in `src/main/ipc/agent-ipc.ts` and delegate to the service dependency.
7. Update renderer consumers to call `window.agent`.
8. Add focused tests for the service behavior, IPC handler mapping, and renderer usage when the change affects UI behavior.

## Verification

For implementation changes, run the narrowest relevant checks:

- `yarn typecheck:node` when shared, preload, or main-process types changed.
- `yarn typecheck:web` when renderer-facing types or renderer consumers changed.
- `yarn test:main` for main service or IPC behavior.
- `yarn test:renderer` for renderer hooks or components using `window.agent`.
