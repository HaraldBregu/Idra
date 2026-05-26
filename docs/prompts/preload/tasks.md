# TasksApi Preload Prompt

Expose background task behavior through `window.tasks`. This API is the renderer-safe bridge to `TaskManager`; it must not expose task manager internals, task handlers, queues, or runner instances directly.

## Expose

- Start a user task.
- List task records.
- Read one task record by id.
- Cancel a task by id.
- Subscribe to task lifecycle events.

## Dependencies

- Shared task request, record, and event types.
- Typed task invoke channels for commands and queries.
- Typed task event channels for lifecycle events.
- A main-process handler that delegates to `TaskManager`.
- Main-process request parsing and validation.
- Main-process event broadcasting for task lifecycle changes.

## Rules

- Use invoke-style calls for task commands and queries.
- Use subscription-style calls for lifecycle events.
- Parse and validate start requests outside preload.
- Validate task ids outside preload.
- Keep queueing, concurrency, cancellation, retention, task handlers, and runner behavior in `TaskManager`.
- Return unsubscribe functions from event subscriptions.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run task manager or IPC tests when task behavior changes.
- Run renderer checks when renderer consumers change.
