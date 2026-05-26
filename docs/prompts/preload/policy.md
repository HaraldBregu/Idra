# PolicyApi Preload Prompt

Expose policy configuration through `window.policy`. This API is the renderer-safe bridge to `PolicyService`; it must not expose service instances, internal policy storage, or raw persisted state.

## Expose

- Read the current policy configuration.
- Replace the current policy configuration and return the saved policy.

## Dependencies

- Shared policy configuration types.
- Typed policy invoke channels.
- A main-process handler that delegates to `PolicyService`.
- Main-process logging for handler registration and failures.

## Rules

- Use invoke-style calls for every policy operation.
- Keep policy validation and persistence in `PolicyService` or shared policy code.
- Do not duplicate policy defaults in preload.
- Do not expose partial writes unless `PolicyService` owns that behavior.
- Do not expose raw policy storage to the renderer.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run focused policy service or IPC tests when policy behavior changes.
- Run renderer checks when renderer consumers change.
