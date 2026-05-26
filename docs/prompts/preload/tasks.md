# TasksApi Preload Prompt

Expose background task behavior through `window.tasks`. `TasksApi` is the renderer-safe bridge to `TaskManager`; it must not expose task manager internals, task handlers, queues, or runner instances directly.

## Expose

- `start(request)`: start a user task.
- `list()`: list task records.
- `get(id)`: read one task record.
- `cancel(id)`: cancel a task.
- `onEvent(callback)`: subscribe to task lifecycle events.

## Dependencies

- Shared types: `src/shared/tasks.ts`.
- Main request parsing: `parseTaskRunRequest` from `src/main/tasks`.
- Channels: `TaskChannels`, `TaskInvokeChannelMap`, and `TaskEventChannelMap` in `src/shared/ipc-channels/index.ts`.
- Preload interface: `TasksApi` in `src/preload/index.d.ts`.
- Preload implementation: `tasks` in `src/preload/index.ts`.
- Main IPC: `src/main/ipc/tasks-ipc.ts`.
- Main services: `taskManager` and `eventBus`.

## Rules

- Use `typedInvokeUnwrap` for task commands and queries.
- Use `typedOn(TaskChannels.event, callback)` for lifecycle events.
- Parse and validate start requests in main-process task code.
- Validate task ids in main IPC or service code.
- Keep queueing, concurrency, cancellation, retention, task handlers, and runner behavior in `TaskManager`.

## Verification

- Run `yarn typecheck:node` for shared, preload, or IPC type changes.
- Run task manager or IPC tests when task behavior changes.
- Run `yarn typecheck:web` when renderer consumers change.
