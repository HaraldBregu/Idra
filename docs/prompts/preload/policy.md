# PolicyApi Preload Prompt

Expose policy configuration through `window.policy`. `PolicyApi` is the renderer-safe bridge to `PolicyService`; it must not expose policy service instances or internal policy storage.

## Expose

- `get()`: read the current policy configuration.
- `set(policy)`: replace the current policy configuration and return the saved policy.

## Dependencies

- Shared types: `src/shared/policy.ts`.
- Channels: `PolicyChannels` and `PolicyInvokeChannelMap` in `src/shared/ipc-channels/index.ts`.
- Preload interface: `PolicyApi` in `src/preload/index.d.ts`.
- Preload implementation: `policy` in `src/preload/index.ts`.
- Main IPC: `src/main/ipc/policy-ipc.ts`.
- Main services: `policy` and `logger`.

## Rules

- Use `typedInvokeUnwrap` for both methods.
- Keep policy validation and persistence in `PolicyService` or shared policy code.
- Do not duplicate policy defaults in preload.
- Do not expose partial writes unless `PolicyService` owns that behavior.

## Verification

- Run `yarn typecheck:node` for shared, preload, or IPC type changes.
- Run focused policy service or IPC tests when policy behavior changes.
- Run `yarn typecheck:web` when renderer consumers change.
