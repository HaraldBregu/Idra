# Main Task Module Implementation Plan

## Scope

This review covers the main-process background task module and its direct entry points:

- `src/main/tasks/*`
- `src/main/ipc/tasks-ipc.ts`
- `src/main/tools/local/task.ts`
- task scheduler adapters in `src/main/cron/*`

The current implementation has a useful foundation: task handlers validate `unknown` inputs, renderer-started task types must be explicitly marked user-facing, task metadata and results are sanitized before storage, and task lifecycle events are typed. The main gaps are around runtime control, retention, and boundary clarity.

## Design Findings

### 1. Background task concurrency is configured but not enforced

`BackgroundTaskSettings` exposes `defaultConcurrency`, and `StoreService` reads it from settings, but `TaskManager` only consults `allowedTaskTypes`. Every task starts on the next microtask through `Promise.resolve().then(...)`.

References:

- `src/main/store/types.ts:28`
- `src/main/store/service.ts:166`
- `src/main/tasks/task-manager.ts:178`
- `src/main/tasks/task-manager.ts:215`

Risk: renderer actions, tool calls, managed schedules, and Friday cron jobs can start unbounded agent work. This can overload the selected provider, make cancellation less predictable, and create confusing queued state because `queued` currently means "created but about to start", not "waiting for capacity".

Design direction: make `TaskManager` own a small execution queue. Use `defaultConcurrency` as the default max active task count, keep `queued` tasks queued until a slot is available, and start the next queued task when a running task reaches a terminal state.

### 2. Task records are retained indefinitely in memory

`TaskManager` stores all records in a `Map` and `list()` returns every record. Terminal task results can contain sanitized but still large text payloads. Scheduler adapters also scan this same list for idempotency and running-task lookup.

References:

- `src/main/tasks/task-manager.ts:152`
- `src/main/tasks/task-manager.ts:219`
- `src/main/cron/scheduler/cron-runner.ts:192`
- `src/main/cron/scheduler/cron-runner.ts:208`

Risk: long-running sessions and recurring schedules can grow memory and make list scans slower. If cleanup is added naively, cron idempotency can break because `findExistingTask()` currently depends on task records remaining available.

Design direction: add explicit retention rules before adding cleanup. Keep active records indefinitely while active, retain terminal records by count and/or age, and preserve enough cron idempotency metadata for the scheduler's retry window. If idempotency needs longer retention than UI history, move it to cron-owned execution state instead of task history.

### 3. TaskManager is carrying too many responsibilities

`TaskManager` currently validates request basics, checks policy, manages lifecycle transitions, sanitizes values, owns in-memory storage, starts handlers, emits events, and formats task errors.

References:

- `src/main/tasks/task-manager.ts:62`
- `src/main/tasks/task-manager.ts:114`
- `src/main/tasks/task-manager.ts:187`
- `src/main/tasks/task-manager.ts:248`
- `src/main/tasks/task-manager.ts:319`
- `src/main/tasks/task-manager.ts:339`

Risk: the class is still readable, but new concerns such as concurrency, retention, timeout, or persistence would make it harder to test and reason about. The sanitizer is already exported, which suggests it is a reusable policy but still lives inside the manager.

Design direction: keep the public `TaskManager` API stable, but split only the concerns needed by the next changes:

- `task-redaction` for task-safe value sanitization.
- `task-state` or local transition helper for transition validation.
- `TaskRecordStore` port with an in-memory implementation only if retention/indexing requires more than a `Map`.

Do not add a DI container or generic repository.

### 4. IPC accepts a loose object before relying on deeper validation

`TasksIpc` narrows `tasks:start` to "any non-array object" and forwards it to `TaskManager`. `TaskManager` and `AgentTaskHandler` perform the real validation, so this is not currently unsafe, but the process boundary does not have an explicit request parser.

References:

- `src/main/ipc/tasks-ipc.ts:14`
- `src/main/ipc/tasks-ipc.ts:26`
- `src/main/tasks/task-manager.ts:191`
- `src/main/tasks/handlers/agent-task-handler.ts:50`

Risk: boundary errors stay stringly typed, and future task types could accidentally rely on handler-level validation only. Tool and cron paths also construct `TaskRunRequest` manually, which can drift from IPC behavior.

Design direction: add one small parser/factory for task start requests, returning a typed `TaskRunRequest` or throwing a stable validation error. Reuse it from IPC and the local `task` tool. Leave handler-specific input validation in each handler.

### 5. Error and cancellation semantics are implicit

Cancellation is represented by an `AbortError` name check, and failures are reduced to `{ code, message }`. This works for `AgentTaskHandler`, but generic handlers must know to throw an `AbortError` for cancellation to become `cancelled` instead of `failed`.

References:

- `src/main/tasks/task-manager.ts:136`
- `src/main/tasks/task-manager.ts:276`
- `src/main/tasks/handlers/agent-task-handler.ts:22`
- `src/main/tasks/handlers/agent-task-handler.ts:90`

Risk: future handlers can accidentally convert expected cancellation into task failure. Renderer and tool callers also get inconsistent validation and runtime errors through generic `Error` messages.

Design direction: introduce minimal task error helpers, such as `taskCancelled()` and `isTaskCancelledError()`, plus a small union of public error codes for validation, policy, cancellation, and handler failure. Keep messages user-readable and redacted.

### 6. There is no task timeout or shutdown path

Task execution waits for handler resolution. Cron's task executor waits on lifecycle events until the task reaches a terminal state or the scheduler abort signal fires.

References:

- `src/main/tasks/task-manager.ts:260`
- `src/main/cron/friday/runtime-adapters.ts:76`
- `src/main/cron/friday/runtime-adapters.ts:84`

Risk: a handler that never resolves can hold a concurrency slot forever once concurrency is enforced, and cron execution can remain pending until an external abort happens.

Design direction: add an optional task timeout policy after queueing is in place. On timeout, abort the task signal and mark the task as failed or cancelled according to a documented rule. Add a `shutdown()` or `cancelAllActive()` path for app shutdown if active task cleanup becomes required.

## Implementation Plan

### Phase 1: Preserve behavior with focused tests

Success criteria:

- Existing task manager, agent task handler, IPC, tool, and cron task tests continue to pass.
- Tests document current concurrency, retention, and cancellation behavior before refactoring.

Implementation:

1. Add tests around `defaultConcurrency` being read from settings and passed to `TaskManager` wiring.
2. Add a task manager test for queued tasks waiting when concurrency is full.
3. Add a cancellation test for queued tasks and running tasks under concurrency limits.
4. Add a cron scheduler test that verifies idempotency still works when task history cleanup is introduced later.

Verification:

- `yarn test:main tests/unit/main/tasks`
- `yarn test:main tests/unit/main/ipc/tasks-ipc.test.ts`
- `yarn test:main tests/unit/main/cron/scheduler.test.ts`
- `yarn test:main tests/unit/main/cron/friday.test.ts`

### Phase 2: Enforce bounded execution in TaskManager

Success criteria:

- `defaultConcurrency` limits active tasks.
- `queued` means the task is waiting for capacity.
- Cancelling a queued task never starts its handler.
- Completing, failing, or cancelling a running task starts the next queued task.

Implementation:

1. Extend `TaskManagerOptions` with a concurrency source derived from background task policy.
2. Track queued task ids separately from active task ids.
3. Replace immediate `Promise.resolve().then(...)` execution with a `pumpQueue()` helper.
4. Ensure terminal transitions always release an active slot and trigger `pumpQueue()`.
5. Keep `run()` and `startUserTask()` public signatures unchanged.

Verification:

- Task manager unit tests for concurrency and cancellation.
- Existing cron tests to catch scheduler behavior changes.

### Phase 3: Add explicit retention and indexing

Success criteria:

- Terminal task history is bounded.
- Active tasks are never pruned.
- Renderer list calls stay fast enough for repeated use.
- Cron idempotency is not weakened.

Implementation:

1. Add task history retention settings with conservative defaults, such as max terminal record count and max terminal age.
2. Keep a simple in-memory store first. Add indexes only for real query paths: by id, by status, and optionally by cron schedule/run metadata.
3. Decide whether cron idempotency belongs in task history or cron execution state. Prefer cron-owned execution state if the idempotency window exceeds UI history retention.
4. Add tests for pruning terminal records without pruning running or queued records.

Verification:

- Task manager retention tests.
- Cron scheduler idempotency tests.
- Renderer task manager list behavior smoke test if available.

### Phase 4: Clarify boundaries and error semantics

Success criteria:

- IPC and tool task starts use the same request parser.
- Task validation, policy, cancellation, and handler failures produce stable public error codes.
- Future handlers can mark cancellation without relying on ad hoc `Error.name` conventions.

Implementation:

1. Add a small `parseTaskRunRequest(value: unknown): TaskRunRequest` helper for process/tool boundaries.
2. Add `TaskValidationError`, `TaskPolicyError`, and `TaskCancelledError` helpers only if plain factory functions are not enough.
3. Update `TaskManager` error mapping to use stable task error codes while preserving redacted messages.
4. Update IPC and tool tests for invalid task request shapes and stable errors.

Verification:

- IPC tests for invalid start payloads.
- Tool tests for invalid arguments.
- Task manager tests for cancellation versus failure.

### Phase 5: Separate only the useful internal concerns

Success criteria:

- `TaskManager` remains the application service facade.
- Sanitization and transition rules are independently testable.
- No broad pattern stack or generic repository is introduced.

Implementation:

1. Move task value sanitization into a dedicated module if retention/error work touches it again.
2. Move transition validation into a local helper only if queueing makes transition tests hard to isolate.
3. Consider a `TaskRecordStore` interface only if retention/indexing creates enough store behavior to justify a port.

Verification:

- Unit tests for sanitization and transition helpers.
- Existing task manager behavior tests remain black-box through public methods.

## Recommended First Pull Request

Start with Phase 2 plus the minimum tests from Phase 1. That closes the clearest implementation bug: `defaultConcurrency` exists in settings but does not affect runtime behavior. Retention should follow as a separate pull request because it interacts with cron idempotency and task history UX.
