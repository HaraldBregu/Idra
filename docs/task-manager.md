# Task Manager

This document defines the future task manager for Friday. It is an implementation contract for running, tracking, retrieving, and cancelling concurrent in-memory tasks.

## Purpose

The task manager owns background work that can run at the same time as other work in the app. A task can represent any executable unit, including an agent run, OCR job, API call, connector sync, local function, or file operation.

The task manager is not a scheduler. Cron and heartbeat features may create tasks, but the task manager only owns task execution and task state for the current app session.

## Core Requirements

- Run multiple tasks concurrently.
- Store every task record in memory for the current app session.
- Expose task state to the renderer through a typed preload API.
- Allow the user to cancel a running task.
- Support any task type through registered task handlers.
- Use one task record per operation.
- Emit lifecycle updates when a task is created, started, updated, completed, failed, or cancelled.
- Never auto-complete, auto-fail, or auto-cancel a task because of a timeout.

## Non-Goals

- Do not persist task records across app restarts.
- Do not create a retry queue.
- Do not replace cron schedules or heartbeat wake logic.
- Do not expose arbitrary task execution directly to the renderer.
- Do not store secrets, raw credentials, or large unbounded outputs in task records.

## Lifecycle

Task status values:

- `queued`: task record exists but the handler has not started.
- `running`: task handler is executing.
- `cancelling`: cancellation has been requested and the handler is expected to stop cooperatively.
- `cancelled`: task stopped because cancellation was requested.
- `succeeded`: task completed with a result.
- `failed`: task completed with an error.

Allowed transitions:

- `queued` -> `running`
- `queued` -> `cancelled`
- `running` -> `cancelling`
- `running` -> `succeeded`
- `running` -> `failed`
- `cancelling` -> `cancelled`
- `cancelling` -> `failed`

Cancellation must be cooperative. The task manager should pass an `AbortSignal` to every handler. Handlers must check the signal before expensive work and pass it into APIs that accept cancellation.

## Task Record

Use serializable shared types so records can cross IPC safely.

```ts
export type TaskStatus =
	| 'queued'
	| 'running'
	| 'cancelling'
	| 'cancelled'
	| 'succeeded'
	| 'failed';

export interface TaskRecord<TResult = unknown> {
	id: string;
	type: string;
	title: string;
	status: TaskStatus;
	createdAt: string;
	startedAt?: string;
	finishedAt?: string;
	progress?: {
		current?: number;
		total?: number;
		message?: string;
	};
	metadata: Record<string, unknown>;
	result?: TResult;
	error?: {
		code: string;
		message: string;
	};
}
```

Task records are user-visible state. Inputs, metadata, progress, results, and errors must be redacted and size-bounded before they are stored on the record.

## Handler Contract

Each task type registers one handler in the main process.

```ts
export interface TaskHandler<TInput = unknown, TResult = unknown> {
	type: string;
	run(context: TaskContext<TInput>): Promise<TResult>;
}

export interface TaskContext<TInput> {
	taskId: string;
	input: TInput;
	signal: AbortSignal;
	updateProgress(progress: TaskRecord['progress']): void;
}
```

Handlers may call APIs, run local functions, start agents, or start OCR. Handlers must not mutate the task store directly; they report progress through the provided context and return a result or throw an error.

## Main-Process Architecture

Add a main-process task module when this feature is implemented:

- `src/shared/tasks.ts`: shared task types and IPC-safe event payloads.
- `src/main/tasks/task-manager.ts`: in-memory task store, lifecycle transitions, cancellation, and event emission.
- `src/main/tasks/task-registry.ts`: task type registration and lookup.
- `src/main/tasks/handlers/*`: concrete task handlers, such as agent and OCR handlers.
- `src/main/ipc/tasks-ipc.ts`: typed IPC handlers for task list/get/cancel and task events.
- `src/preload/index.ts` and `src/preload/index.d.ts`: `window.tasks` preload API.
- `src/shared/ipc-channels.ts`: task IPC channel constants and invoke channel map entries.
- `src/main/service-registry.ts`: register the task manager as a main service.

The task manager should use a `Map<string, InternalTaskState>` for in-memory storage. Internal state may include the handler promise and `AbortController`; the public `TaskRecord` must not.

## Preload API

Expose a small renderer API:

```ts
export interface TasksApi {
	list: () => Promise<TaskRecord[]>;
	get: (id: string) => Promise<TaskRecord | undefined>;
	cancel: (id: string) => Promise<TaskRecord>;
	onEvent: (callback: (event: TaskEvent) => void) => () => void;
}
```

The renderer can retrieve and cancel tasks. Starting tasks from the renderer should be added only for specific user-facing task types and must validate the requested type and input in the main process.

## Events

Use one event stream for renderer updates and main-process observers.

```ts
export type TaskEvent =
	| { type: 'task:created'; task: TaskRecord }
	| { type: 'task:started'; task: TaskRecord }
	| { type: 'task:updated'; task: TaskRecord }
	| { type: 'task:succeeded'; task: TaskRecord }
	| { type: 'task:failed'; task: TaskRecord }
	| { type: 'task:cancelled'; task: TaskRecord };
```

Each task event describes one task record. A single user operation should not create a parent task plus child task records; model it as one task unless a separate operation is started.

## Timeout Rule

The task manager must not use default execution timeouts. Do not implement task execution with `setTimeout`, `Promise.race` timeout wrappers, polling loops that fail after elapsed time, or automatic expiry logic.

A task can finish only when:

- its handler returns a result;
- its handler throws an error;
- cancellation is requested and the handler stops;
- the app process exits.

If a specific external API requires its own timeout, keep that timeout local to the API adapter and report the adapter error as a normal task failure. Do not make the task manager itself enforce a timeout.

## Safety Rules

- Validate task type and input before running a handler.
- Keep privileged decisions in the main process.
- Do not expose raw handler functions through preload.
- Redact secrets before storing task input, metadata, progress, result, or error state.
- Bound stored result and progress sizes because task records remain in memory for the session.
- Use typed IPC and shared types instead of untyped string channels.
- Log task lifecycle events without storing private task payloads in logs.
- Make cancellation idempotent. Cancelling a completed task should return the current task record.

## Implementation Steps

1. Add shared task types and IPC channel definitions.
2. Add the main-process `TaskManager` and task registry.
3. Register the task manager in the service container.
4. Add IPC handlers and the `window.tasks` preload API.
5. Add the first concrete handlers, starting with agent and OCR tasks.
6. Add renderer retrieval and cancellation UI where needed.
7. Add focused tests for lifecycle transitions, concurrent execution, cancellation, and no default timeout behavior.

## Verification

Minimum checks for the implementation:

```bash
yarn typecheck
yarn lint
yarn test
```

Required tests:

- Two tasks can run concurrently and complete independently.
- `list` and `get` return current in-memory records through IPC.
- Cancelling a running task moves it through `cancelling` to `cancelled`.
- One operation creates one task record.
- A task does not fail or cancel because elapsed time passes.
- Completed, failed, and cancelled tasks remain retrievable until the app session ends.
