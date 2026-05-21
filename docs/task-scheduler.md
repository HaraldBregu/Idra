# Task Scheduler

This document describes the task scheduler module in `src/main/cron` and how
schedules are created, persisted, and evaluated.

## Module Contract

The task scheduler is a separated Friday module. It owns timing, schedule
persistence, due-run processing, retry policy, concurrency policy, audit events,
and the LLM-facing `cron` tool.

Module surfaces:

- Service/facade: `CronService` in the main process.
- LLM tool: `cron`.
- Renderer IPC: `cron:*` channels.
- Storage: managed scheduler state under `cronScheduler` and Friday tool
  schedules under `fridayCron`.

Dependencies:

- `StoreService` and `CronScheduleStore` for persisted schedule state.
- Clock/timer utilities and cron-expression calculation.
- Task execution modules for the work that runs after a schedule fires.
- `AgentService` only for Friday cron jobs that intentionally run an agent
  turn.
- Event and audit modules for lifecycle reporting.

The scheduler does not own provider or model selection for model-backed work.
Provider-backed execution belongs to the module that performs the work.

## Purpose

The task scheduler owns scheduled work in the main process. It supports three
related scheduling paths:

- Managed schedules through `CronSchedulerService`.
- Friday LLM tool schedules through `FridayCronScheduler`.
- Legacy `node-cron` jobs through `CronService.schedule()`.

Managed schedules are the richer schedule model. They include permissions,
auditing, persistence, missed-run handling, concurrency policy, retries, and
execution records.

Friday tool schedules are the user-facing agent cron jobs handled by the `cron`
tool. They store a compact job definition and run agent turns or system events.

The legacy `node-cron` path schedules a persisted expression and handler
directly. It remains available for simple cron tasks.

## Main Files

- `src/main/cron/service.ts`: top-level `CronService` facade used by the app.
- `src/main/cron/scheduler/cron-scheduler.ts`: managed schedule lifecycle and
  due-run processing.
- `src/main/cron/scheduler/cron-next-run-calculator.ts`: next-run calculation
  for managed schedules.
- `src/main/cron/scheduler/cron-runner.ts`: creates in-memory task records when
  managed schedules fire.
- `src/main/cron/core/cron.validation.ts`: schedule shape, timezone, and cron
  expression validation.
- `src/main/cron/core/cron.describer.ts`: human-readable schedule descriptions.
- `src/main/cron/store/electron-store-cron-schedule-store.ts`: persistence for
  managed schedules, events, executions, and locks.
- `src/main/cron/friday/scheduler.ts`: Friday cron job lifecycle.
- `src/main/cron/friday/normalize.ts`: normalizes tool requests into Friday
  cron add/update requests.
- `src/main/cron/friday/validation.ts`: validates Friday cron jobs.
- `src/main/ipc/cron-ipc.ts`: renderer IPC entry points for cron.
- `src/shared/cron.ts`: shared cron types used across main, preload, and
  renderer code.

## Managed Schedule Creation

Managed schedules are created through `CronService.createSchedule(request,
actor)`, which delegates to `CronSchedulerService.createSchedule()`.

Renderer callers use the `cron:createSchedule` IPC channel. The IPC handler
validates the minimum request shape, defaults the source to `ui` when needed,
builds a UI actor, and calls `cron.createSchedule()`.

Agent callers use `AgentCronService.createScheduleFromAgent()`. That helper
fills the agent source fields:

- `source: 'agent'`
- `sourceId: agentContext.agentId`
- `createdBy: agentContext.agentId`
- `ownerUserId`, `sessionId`, `timezone`, and `visibility` from the agent
  context or request

The managed creation flow is:

1. Authorize the actor for `createSchedule`.
2. Validate frequency limits through the access policy.
3. Validate the schedule shape with `validateScheduleShape()`.
4. Reject secret-looking keys inside `taskInput`.
5. Build a full `CronSchedule` record from the create request.
6. Compute the first `nextRunAt` with `CronNextRunCalculator`.
7. Add a `schedule.created` audit entry.
8. Persist the schedule with `CronScheduleStore.createSchedule()`.
9. Append and emit a `schedule.created` event.

## Managed Schedule Request

The create request type is `CronScheduleCreateRequest` in `src/shared/cron.ts`.

Required fields:

```ts
{
	name: string;
	type: CronScheduleType;
	source: CronScheduleSource;
	createdBy: string;
	timezone: string;
	taskType: string;
	taskInput: CronJsonValue;
}
```

Schedule-specific required fields:

- `type: 'cron'` requires `cronExpression`.
- `type: 'interval'`, `type: 'fixedRate'`, and `type: 'fixedDelay'` require
  `intervalMs`.
- `type: 'oneTime'` requires `runAt`.
- `type: 'calendar'` and `type: 'manual'` do not currently produce automatic
  next runs.

Common optional fields:

- Ownership and visibility: `ownerUserId`, `sessionId`, `visibility`.
- Bounds: `startAt`, `endAt`, `maxRuns`.
- Missed-run behavior: `missedRunPolicy`, `maxCatchUpRuns`,
  `catchUpWindowMs`.
- Concurrency behavior: `concurrencyPolicy`.
- Retry behavior: `retryPolicy`.
- Task metadata: `taskPriority`, `taskTags`, `taskMetadata`.
- Security: `requiredPermissions`, `requiresConfirmation`,
  `confirmationPolicy`.
- State: `enabled`, `metadata`.

## Managed Schedule Defaults

`CronSchedulerService.createSchedule()` fills these defaults:

- `id`: generated UUID.
- `status`: `active` unless `enabled` is explicitly `false`, then `disabled`.
- `ownerUserId`: request value or actor user id.
- `sessionId`: request value or actor session id.
- `visibility`: `user`.
- `timezone`: request timezone, actor timezone, or scheduler default timezone.
- `runCount`: `0`.
- `missedRunPolicy`: `skip`.
- `maxCatchUpRuns`: scheduler run policy default.
- `catchUpWindowMs`: scheduler run policy default.
- `concurrencyPolicy`: `skipIfRunning`.
- `retryPolicy`: scheduler default retry policy merged with the request retry
  policy.
- `taskPriority`: `normal`.
- `taskTags`: empty array.
- `taskMetadata`: empty object.
- `requiredPermissions`: empty array.
- `requiresConfirmation`: `false`.
- `enabled`: `true`.
- `metadata`: empty object.
- `createdAt` and `updatedAt`: current ISO timestamp.

The cron expression is normalized by trimming it and collapsing repeated
whitespace.

## Next Run Calculation

`CronNextRunCalculator.getNextRun(schedule, from)` calculates the next run
based on the schedule type.

For `cron` schedules:

- The expression must use 5 fields: minute, hour, day of month, month, day of
  week.
- Fields support `*`, comma lists, ranges, and step values.
- Time matching is evaluated in the schedule timezone through
  `Intl.DateTimeFormat`.
- The calculator starts at the next full minute after `from`.
- It scans forward up to 366 days.
- If both day-of-month and day-of-week are restricted, either may match.
- If only one of day-of-month or day-of-week is restricted, both normal cron
  fields must match.

For interval schedules:

- `interval` uses the last run/evaluation/start/create time as the base.
- `fixedRate` uses the original start/create anchor as the base.
- `fixedDelay` schedules after the last successful run, last run, start, or
  create time.

For one-time schedules:

- `runAt` is returned only if it is in the future, the schedule has not run,
  and the schedule is not completed.

For all managed schedule types:

- Disabled or deleted schedules return no next run.
- Schedules at `maxRuns` return no next run.
- `startAt`, `endAt`, and `maxRuns` bounds are enforced.

## Runtime Processing

`CronSchedulerService.start()` recovers schedules on startup, then checks due
schedules every `pollIntervalMs` milliseconds. The default poll interval is 30
seconds.

Due processing works like this:

1. Load active schedules whose `nextRunAt` is due.
2. Limit the batch to `runPolicy.maxRunsPerTurn`.
3. Acquire a per-schedule lock.
4. Re-read and validate that the schedule can still run.
5. Emit `schedule.due`.
6. Build an idempotency key from `scheduleId` and `scheduledRunAt`.
7. Ignore duplicate executions or already-created tasks.
8. Apply the concurrency policy.
9. Create a scheduled task through the runner, with retries if configured.
10. Increment `runCount`, update `lastRunAt`, recompute `nextRunAt`, and mark
    completed schedules.
11. Record an execution and emit `schedule.triggered`.

The default runner is `InMemoryCronScheduleRunner`. It creates a
`CronScheduledTask` with:

- `source: 'cron'`
- `sourceId`: schedule id
- `type`: schedule `taskType`
- `input`: redacted schedule `taskInput`
- metadata containing the scheduled time, actual trigger time, run number,
  missed-run flag, runner id, and idempotency key

## Module-Backed Scheduled Work

The task scheduler owns timing, persistence, and due-run processing. It does
not own provider or model selection for model-backed work.

When a schedule triggers module-backed work, the schedule stores the task type
and sanitized task input only. The task handler or target main-process module
resolves its own provider, model, endpoint, and runtime dependencies when it
executes.

Current compatibility settings are still stored under keys such as
`operator.imageCreator`. Treat those as storage keys, not as the product model
for these modules.

Recommended module task types:

- `text-to-speech.run`: calls the text-to-speech module.
- `image.create`: calls the image module.
- `video.create`: calls the video module.
- `sound.create`: calls the sound module.
- `ocr.run`: calls the OCR module or the configured OCR endpoint.
- `embedding.index`: calls the embedding module when that module exists.

Cron payloads must not store API keys, base URLs, webhook secrets, or raw
provider records. If a future scheduled task supports a provider/model
override, the payload may contain only ids; credentials and full provider
configuration must still be resolved from `StoreService`.

Example media schedule:

```ts
await cron.createSchedule({
	name: 'Create weekly product image',
	type: 'cron',
	source: 'agent',
	sourceId: 'agent',
	createdBy: 'agent',
	visibility: 'user',
	timezone: 'Europe/Rome',
	cronExpression: '0 8 * * 1',
	missedRunPolicy: 'skip',
	concurrencyPolicy: 'skipIfRunning',
	taskType: 'image.create',
	taskInput: {
		prompt: 'Create a square product image for the weekly announcement.',
		aspectRatio: '1:1',
		count: 1,
	},
});
```

When this schedule fires, the task scheduler creates or dispatches an
`image.create` task. The image task calls the image module, and the image module
reads its saved settings to choose the provider and model.

## Missed Runs

Startup recovery handles schedules whose persisted `nextRunAt` is already in
the past.

Policies:

- `skip`: compute the next future run and emit `schedule.skipped`.
- `runOnce`: trigger one missed run.
- `catchUp`: trigger missed runs within the catch-up window, limited by
  `maxCatchUpRuns` and `maxRunsPerTurn`.
- `fail`: mark the schedule failed.
- `askUser`: currently triggers the missed run.

## Concurrency Policies

When a schedule is due and a previous task is still running:

- `allowOverlap`: create another task.
- `skipIfRunning`: record a skipped execution and move to the next run.
- `queueIfRunning`: currently proceeds to create the next task.
- `cancelPrevious`: cancel running tasks, then create the new task.
- `replacePrevious`: cancel running tasks, then create the new task.

## Friday Tool Schedule Creation

Friday cron jobs are created through `CronService.fridayAction(request, actor,
context)`, which delegates to `FridayCronScheduler.handleToolAction()`.

The normal add flow is:

1. Normalize the raw tool request with `normalizeFridayCronToolRequest()`.
2. Convert the add payload into a `FridayCronAddRequest`.
3. Validate the actor can add jobs.
4. Load the Friday cron store snapshot.
5. Create a `FridayCronJobDefinition`.
6. Validate the job with `assertValidFridayJob()`.
7. Create default job state.
8. Compute `state.nextRunAtMs` when the job is enabled.
9. Save the snapshot.
10. Arm the next timer.

Friday schedules support three schedule shapes:

```ts
type FridayCronSchedule =
	| { kind: 'at'; at: string }
	| { kind: 'every'; everyMs: number; anchorMs?: number }
	| { kind: 'cron'; expr: string; tz?: string; staggerMs?: number };
```

Normalization accepts compact forms:

- `at` or `atMs` creates `{ kind: 'at' }`.
- `everyMs` creates `{ kind: 'every' }`.
- `expr` or `cron` creates `{ kind: 'cron' }`.
- `tz` sets the cron timezone.
- `exact: true` disables stagger by setting `staggerMs` to `0`.

Friday next-run calculation works like this:

- `at`: returns the timestamp until it has run once.
- `every`: advances from `anchorMs` or job creation time by `everyMs`, bounded
  by the scheduler minimum refire gap.
- `cron`: reuses `CronNextRunCalculator` by wrapping the Friday job as a
  temporary managed cron schedule, then adds `staggerMs` when present.

## Legacy Node-Cron Jobs

`CronService.schedule(id, expression, data, handler, options)` uses the
`node-cron` package directly.

Creation flow:

1. Reject duplicate job ids.
2. Validate the cron expression with `node-cron`.
3. Build a persisted `CronTask` record.
4. If automatic cron execution is disabled, persist the task without arming it.
5. Otherwise call `cron.schedule(expression, handler, { timezone })`.
6. Store the registered job in memory.
7. Persist the task through `StoreService`.
8. Optionally run the handler immediately when `runOnStart` is set.

Persisted legacy tasks are restored with `CronService.restore(dispatcher)`.
Restore validates each expression, recreates the `node-cron` schedule, and
dispatches through the supplied handler.

## Disabling Automatic Execution

Automatic execution is disabled when either condition is true:

- `SKIP_CRON=1`
- `CRON_ENABLED=false`

When disabled, managed scheduler execution is not started and Friday cron
timers are not armed. Legacy jobs are still persisted, but their timers are not
scheduled.

## Example Managed Schedule

```ts
await cron.createSchedule({
	name: 'Review invoices reminder',
	type: 'cron',
	source: 'agent',
	sourceId: 'agent',
	createdBy: 'agent',
	visibility: 'user',
	timezone: 'Europe/Rome',
	cronExpression: '0 9 * * 1',
	missedRunPolicy: 'skip',
	concurrencyPolicy: 'skipIfRunning',
	taskType: 'reminder.show',
	taskInput: { message: 'Review invoices' },
});
```

This creates an active schedule that runs every Monday at 09:00 in the
`Europe/Rome` timezone. During creation, the scheduler validates the cron
expression, computes the first `nextRunAt`, persists the schedule, and emits
`schedule.created`.
