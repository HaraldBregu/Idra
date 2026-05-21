# Background Task

This document defines the background task module for Friday. It is the
implementation contract for running, tracking, retrieving, and cancelling
concurrent in-memory tasks.

## Module Contract

The background task module is a separated piece of main-process software. It
owns immediate task execution and task lifecycle state for the current app
session.

Module surfaces:

- Service class: `TaskManager`.
- Registry: `TaskRegistry`.
- LLM tool: `task`.
- Renderer IPC: `tasks:*` channels.
- Storage: in-memory only.

Dependencies:

- Registered task handlers under `src/main/tasks/handlers`.
- `AgentService` for the `agent.run` handler.
- OCR, TTS, image, video, sound, and embedding modules when their handlers are
  registered.
- Logger/event infrastructure for lifecycle updates.

The background task module is not a scheduler. The task scheduler and heartbeat
features may create tasks, but this module only owns execution and task state
for the current app session.

## Purpose

The background task module owns work that can run at the same time as other
work in the app. A task can represent any executable unit, including an agent
run, OCR job, TTS job, image generation job, video generation job, sound
generation job, embedding job, API call, connector sync, local function, or
file operation.

## Core Requirements

- Run multiple tasks concurrently.
- Store every task record in memory for the current app session.
- Expose task state to the renderer through a typed preload API.
- Allow the user to manually create a task for approved user-facing task types.
- Allow the user to cancel a running task.
- Support any task type through registered task handlers.
- Use one task record per operation.
- Emit lifecycle updates when a task is created, started, updated, completed,
  failed, or cancelled.
- Never auto-complete, auto-fail, or auto-cancel a task because of a timeout.

## Non-Goals

- Do not persist task records across app restarts.
- Do not create a retry queue.
- Do not replace cron schedules or heartbeat wake logic.
- Do not expose arbitrary task execution directly to the renderer.
- Do not store secrets, raw credentials, or large unbounded outputs in task
  records.

## Lifecycle

Task status values:

- `queued`: task record exists but the handler has not started.
- `running`: task handler is executing.
- `cancelling`: cancellation has been requested and the handler is expected to
  stop cooperatively.
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

Cancellation must be cooperative. The background task module should pass an
`AbortSignal` to every handler. Handlers must check the signal before expensive
work and pass it into APIs that accept cancellation.

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

Task records are user-visible state. Inputs, metadata, progress, results, and
errors must be redacted and size-bounded before they are stored on the record.

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

Handlers may call APIs, run local functions, start agents, or start OCR.
Handlers must not mutate the task store directly; they report progress through
the provided context and return a result or throw an error.

## Agent Tasks

The background task module can run agent work through the registered
`agent.run` handler. An agent task is still a normal task record: it is created,
started, updated, completed, failed, cancelled, listed, and retrieved through
the same lifecycle as every other task type.

The `agent.run` input must include a non-empty `message`. It may also include:

- `agentId`: target agent id; defaults to the main agent when omitted.
- `sessionId`: agent session id; defaults to `task:<taskId>` so each task gets
  an isolated agent session.
- `providerId`: configured provider override for this run.
- `model`: configured model override for this run.
- `effort`: reasoning effort override for providers that support it.
- `lightContext`: whether to run with reduced context.
- `toolsAllow`: optional list of tool names exposed for the run.

The agent task handler must validate and trim task input before it reaches the
agent service. It must not accept API keys, credentials, base URLs, or provider
records from task input. Provider and model selection stays inside the agent
service: the handler passes sanitized `providerId`, `model`, `effort`,
`lightContext`, `toolsAllow`, and `sessionId` as send options, and the service
resolves configured providers, models, API keys, tools, skills, startup files,
hooks, and the final system prompt before running the agent loop.

Agent task execution flow:

1. The background task module validates the `TaskRunRequest`, creates one
   `agent.run` task record, stores it in memory, and emits `task:created`.
2. The task moves to `running`, emits `task:started`, and the handler receives
   the validated input plus an `AbortSignal`.
3. The handler chooses `agentId` and `sessionId`, reports progress as
   `Starting agent`, and calls `AgentService.send(message, agentId, options)`.
4. The agent service prepares the provider-neutral run, evaluates pre-run
   hooks, streams provider/tool-loop work, compacts context if needed, and
   returns the final assistant text.
5. The handler reports progress as `Agent completed` and returns `{ text }`,
   which becomes the sanitized task result.
6. The background task module marks the task `succeeded`, stores the bounded
   result, and emits `task:succeeded`.

Cancellation remains cooperative. When an `agent.run` task is cancelled, the
background task module aborts the task signal. The handler must call
`AgentService.cancel(sessionId)` and then let the running agent stop through
the normal cancellation path. If cancellation wins, the task record is marked
`cancelled`; if the agent throws a non-abort error first, the task records a
normal failure.

## Module-Backed Tasks

Media, ML, OCR, and embedding tasks should be thin wrappers around
main-process modules. The background task module owns lifecycle state; the
target module owns provider/model resolution and execution.

Recommended task types:

- `text-to-speech.run`: calls the TTS module documented in
  [text-to-speech.md](text-to-speech.md).
- `speech-to-text.transcribe`: calls the speech-to-text module documented in
  [speech-to-text.md](speech-to-text.md).
- `image.create`: calls the image module documented in
  [image-creator.md](image-creator.md).
- `video.create`: calls the video module documented in
  [video-creator.md](video-creator.md).
- `sound.create`: calls the sound module documented in
  [music-creator.md](music-creator.md).
- `ocr.run`: calls the OCR module documented in [ocr.md](ocr.md).
- `embedding.index`: calls the embedding module documented in
  [embedding.md](embedding.md).

Module-backed handlers must:

- Validate and trim task input before calling the target module.
- Pass the task `AbortSignal` into adapters that support cancellation.
- Store only sanitized progress and result summaries on the task record.
- Avoid accepting API keys, base URLs, webhook secrets, or provider records
  from task input.
- Use provider/model settings from the matching module selection in
  `StoreService`.

Provider and model selection should not be copied into every task. The default
path is:

1. Task handler receives user input, such as text, prompt, duration, format,
   document content, or asset references.
2. Task handler calls the matching main-process module.
3. The target module reads its saved settings from `StoreService`.
4. The target module resolves the configured provider record from
   `StoreService`.
5. The target module creates the provider adapter and returns a normalized
   result.

Per-task provider/model overrides should be avoided for media and ML modules.
If a module later supports overrides, task input may pass only provider/model
ids; credentials and provider records must still come from `StoreService`.

## Main-Process Architecture

The implemented task module owns these files:

- `src/shared/tasks.ts`: shared task types and IPC-safe event payloads.
- `src/main/tasks/task-manager.ts`: in-memory task store, lifecycle
  transitions, cancellation, and event emission.
- `src/main/tasks/task-registry.ts`: task type registration and lookup.
- `src/main/tasks/handlers/*`: concrete task handlers, such as agent and OCR.
- `src/main/ipc/tasks-ipc.ts`: typed IPC handlers for task start/list/get/cancel
  and task events.
- `src/preload/index.ts` and `src/preload/index.d.ts`: `window.tasks` preload
  API.
- `src/shared/ipc-channels.ts`: task IPC channel constants and invoke channel
  map entries.
- `src/main/service-registry.ts`: service registration.

The task manager should use a `Map<string, InternalTaskState>` for in-memory
storage. Internal state may include the handler promise and `AbortController`;
the public `TaskRecord` must not.

## Preload API

Expose a small renderer API:

```ts
export interface TasksApi {
	start: <TInput = unknown>(request: TaskRunRequest<TInput>) => Promise<TaskRecord>;
	list: () => Promise<TaskRecord[]>;
	get: (id: string) => Promise<TaskRecord | undefined>;
	cancel: (id: string) => Promise<TaskRecord>;
	onEvent: (callback: (event: TaskEvent) => void) => () => void;
}
```

The renderer can start, retrieve, and cancel tasks. User-created tasks must go
through `tasks.start(request)`, and the main process must validate the requested
task type and input before running a handler.

IPC channels:

- `tasks:start`: validates a `TaskRunRequest`, creates one in-memory task
  record, and starts the registered handler.
- `tasks:list`: returns all in-memory task records for the current app session.
- `tasks:get`: returns one task record by id.
- `tasks:cancel`: requests cooperative cancellation for one task by id.
- `tasks:event`: broadcasts task lifecycle events to renderers.

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

Each task event describes one task record. A single user operation should
create one task record unless a separate operation is started.

## Timeout Rule

The background task module must not use default execution timeouts. Do not
implement task execution with `setTimeout`, `Promise.race` timeout wrappers,
polling loops that fail after elapsed time, or automatic expiry logic.

A task can finish only when:

- its handler returns a result;
- its handler throws an error;
- cancellation is requested and the handler stops;
- the app process exits.

If a specific external API requires its own timeout, keep that timeout local to
the API adapter and report the adapter error as a normal task failure. Do not
make the background task module itself enforce a timeout.

## Safety Rules

- Validate task type and input before running a handler.
- Allow renderer-created tasks only for registered user-facing task types.
- Keep privileged decisions in the main process.
- Do not expose raw handler functions through preload.
- Redact secrets before storing task input, metadata, progress, result, or error
  state.
- Bound stored result and progress sizes because task records remain in memory
  for the session.
- Use typed IPC and shared types instead of untyped string channels.
- Log task lifecycle events without storing private task payloads in logs.
- Make cancellation idempotent. Cancelling a completed task should return the
  current task record.

## Implementation Steps

1. Add shared task types and IPC channel definitions.
2. Add the main-process `TaskManager` and task registry.
3. Register the task manager in the service container.
4. Add IPC handlers and the `window.tasks` preload API, including manual task
   creation.
5. Add the first concrete handlers, starting with agent and OCR tasks.
6. Add module-backed handlers for TTS, STT, image, video, sound, OCR, and
   embedding when those main-process modules exist.
7. Add renderer retrieval and cancellation UI where needed.
8. Add focused tests for lifecycle transitions, concurrent execution,
   cancellation, and no default timeout behavior.

## Verification

Minimum checks for the implementation:

```bash
yarn typecheck
yarn lint
yarn test
```

Required tests:

- Two tasks can run concurrently and complete independently.
- A user-created task can be started through preload/IPC for an approved task
  type.
- `list` and `get` return current in-memory records through IPC.
- Cancelling a running task moves it through `cancelling` to `cancelled`.
- One operation creates one task record.
- A task does not fail or cancel because elapsed time passes.
- Completed, failed, and cancelled tasks remain retrievable until the app
  session ends.
- Module-backed media and ML tasks resolve provider/model through
  `StoreService` and reject task input that contains credentials or provider
  records.
