# Tasks Module Prompt

Create a tasks module that is strictly implemented as a reusable service.

The tasks module manages background tasks that run in the background. Tasks must be persisted with Electron Store in a `task.json` file.

The tasks module can run agents as part of task execution.

The tasks module depends on `StoreService`.

The tasks module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the tasks module isolated:

- Do not import internal task files from outside the tasks module.
- Do not expose internal task files directly.
- Only `index` exposes the tasks module.
- Consumers must depend on the exported tasks service.
- Task behavior must stay centralized inside the tasks service.

Types or files that need to be reused by other processes must be stored under `src/shared` so they can be used everywhere. Keep task-specific implementation types and files inside the tasks module unless they are genuinely shared.

The tasks service should:

- Create background tasks.
- Read background task state.
- Update background task state.
- Delete background tasks from memory.
- List background tasks.
- Run tasks in the background.
- Run agents when a task requires agent execution.
- Run agent tasks with the task's `providerId` and `modelId` when they are present.
- Store active task state in Electron Store.

Use Electron Store with the store name `task` so the persisted file is `task.json`.

The `task.json` file should store:

- `schemaVersion`: persistence schema version.
- `records`: list of persisted task records.
- `updatedAt`: ISO timestamp for the last task store write.

Each task record in `records` should store:

- `id`: stable task id.
- `type`: task handler type.
- `title`: human-readable task title.
- `status`: `queued`, `running`, `cancelling`, `cancelled`, `succeeded`, or `failed`.
- `providerId`: provider identifier loaded from the store.
- `modelId`: model identifier loaded from the store.
- `createdAt`: ISO timestamp when the task was created.
- `startedAt`: ISO timestamp when task execution started.
- `finishedAt`: ISO timestamp when task execution ended.
- `progress`: latest progress snapshot.
- `progress.current`: current progress amount.
- `progress.total`: total progress amount.
- `progress.message`: short progress message.
- `metadata`: sanitized caller metadata.
- `result`: sanitized task result.
- `error`: public failure metadata.
- `error.code`: stable error code or error name.
- `error.message`: redacted user-readable failure message.

Only serializable, sanitized task state should be stored. Do not store live handlers, promises, abort controllers, event listeners, provider clients, or secrets in `task.json`.

Each task should have one dependency. Do not add multiple task dependencies unless the existing project requirements explicitly require it.

## Logging

Use the application's logger for all operational reporting, including lifecycle events, state changes, policy decisions, validation failures, errors, and task execution results. Do not use console logging for module behavior.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
