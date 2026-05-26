# HeartbeatApi Preload Prompt

Expose heartbeat configuration and runtime behavior through `window.heartbeat`. This API is the renderer-safe bridge to heartbeat services; it must not expose service instances, scheduler internals, storage objects, provider clients, API keys, or runtime delivery objects.

## Expose

- Read the current heartbeat status.
- Read the last heartbeat event.
- Read the current heartbeat settings.
- Save new heartbeat settings.
- Enable or disable heartbeat execution.
- Read heartbeat timing settings.
- Update heartbeat timing settings.
- Set the heartbeat provider id.
- Set the heartbeat model id.
- Set heartbeat reasoning effort when the selected provider and model support it.
- Trigger a heartbeat request.
- Submit system events that heartbeat needs to evaluate.
- Subscribe to heartbeat events.

## Dependencies

- Shared heartbeat status, settings, timing, event, request, and system-event types.
- Shared provider, model, and reasoning-effort types for model selection.
- Typed heartbeat invoke channels for commands and queries.
- Typed heartbeat event contracts for event subscriptions.
- A main-process handler that delegates to heartbeat services and settings ownership.
- Main-process provider, model, reasoning-effort, timing, persistence, and delivery validation.

## Rules

- Use invoke-style calls for heartbeat commands and queries.
- Use subscription-style calls for heartbeat events and return unsubscribe functions.
- Keep the preload methods thin: validate shape, call typed IPC, and return typed results.
- Keep provider lookup, model validation, reasoning-effort capability checks, persistence, scheduling, and delivery behavior outside preload.
- Save provider id and model id as explicit heartbeat settings, not as generic store writes.
- Save reasoning effort only when the provider and model advertise support for reasoning effort.
- Preserve existing heartbeat settings when applying partial updates.
- Do not return provider secrets, internal scheduler state, delivery queues, or runtime channel clients to the renderer.
- Do not expose generic settings get/set methods for arbitrary heartbeat keys.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run heartbeat service, IPC, or preload tests when settings, model selection, timing, or event behavior changes.
- Run renderer checks when renderer consumers change.
