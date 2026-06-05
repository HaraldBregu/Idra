# Cron Implementation Review And Test Plan

## Scope

This review covers the cron task implementation in the main process, including:

- Managed schedules in `src/main/cron/scheduler/*`.
- Friday cron jobs in `src/main/cron/friday/*`.
- Legacy `node-cron` jobs exposed by `CronService.schedule()`.
- IPC and tool entry points in `src/main/ipc/cron-ipc.ts` and `src/main/tools/local/cron.ts`.

Success for the next cron hardening pass means:

- one clear scheduling boundary for user-facing cron work;
- permission, confirmation, and owner scoping enforced at every entry point;
- deterministic tests for timing, recovery, retries, concurrency, and delivery;
- no stored credentials, provider choices, or unbounded run/event growth.

## Current Architecture

`CronService` currently acts as a facade over three schedulers:

- Managed schedules: persisted `CronSchedule` records that poll due work and create `agent.run` background tasks.
- Friday cron jobs: tool-facing jobs with run history, delivery routing, wake modes, and isolated/main session targets.
- Legacy cron jobs: direct `node-cron` jobs with arbitrary `CronTaskData` payloads.

The managed scheduler has useful ports for storage, running tasks, and access policy. The Friday scheduler has good executor and delivery ports. The main design problem is not the presence of ports; it is that public entry points still expose multiple behavior models with different security, audit, and persistence guarantees.

## Findings

### 1. Access Policy Is A Stub

`DefaultCronScheduleAccessPolicy.authorize()` currently does nothing, and `requiresConfirmation()` always returns false in `src/main/cron/security/cron-access-policy.ts:21`. Tests also encode this behavior by allowing schedule creation with an empty permission list in `tests/unit/main/cron/scheduler.test.ts:318`.

Impact:

- `requiredPermissions`, `requiresConfirmation`, and `confirmed` are accepted by the schedule model but not enforced.
- UI and agent callers can create, update, run, pause, and delete managed schedules if they can reach the service.
- `CronConfirmationManager` exists, but it is in-memory and not wired into `CronSchedulerService` or the persisted confirmation state.

Recommended direction:

- Keep `CronScheduleAccessPolicy` as the policy port.
- Implement permission checks in the default policy before adding new abstractions.
- Wire confirmation through scheduler create/update paths, or remove confirmation fields until they are enforceable.

### 2. IPC Actor Scoping Can Leak Schedules

`uiActor()` grants broad UI permissions but often has no `userId` in `src/main/ipc/cron-ipc.ts:36`. `listSchedules()` only filters by owner when `actor.userId` is present in `src/main/cron/scheduler/cron-scheduler.ts:441`. Because the policy is a stub, a renderer list call can request schedules without a real owner boundary.

Impact:

- Owner scoping depends on optional caller-supplied request data.
- `createSchedule` passes `request.ownerUserId` into the actor in `src/main/ipc/cron-ipc.ts:101`, so the caller can influence ownership context.

Recommended direction:

- Derive UI actor identity from trusted app/session state, not request payload.
- Fail closed when a non-admin actor lacks `userId`.
- Add IPC tests for owner filtering and spoofed `ownerUserId`.

### 3. Legacy Cron Jobs Bypass The Safer Scheduler

Legacy paths call `CronService.schedule()` directly from IPC and tools in `src/main/ipc/cron-ipc.ts:68` and `src/main/tools/local/cron.ts:176`. That method uses `node-cron` directly in `src/main/cron/service.ts:276`, persists arbitrary `CronTaskData`, logs ticks with `console.log`, and does not use managed schedule events, execution history, owner scoping, retry policy, or task-manager semantics.

Impact:

- There are two public ways to schedule recurring work with different safety rules.
- Legacy jobs can store arbitrary payloads that the managed scheduler would reject.
- Legacy runs are hard to audit and cannot be recovered with the managed missed-run policy.

Recommended direction:

- Treat `cron` as the primary tool and mark `cron_add`, `cron_list`, `cron_remove`, and `CronChannels.add/remove/list` as compatibility-only.
- Add tests that legacy entry points either route through the managed scheduler or are unavailable outside migration paths.

### 4. Concurrency Policy Names Overpromise

Managed schedules accept `queueIfRunning`, `cancelPrevious`, and `replacePrevious`, but `applyConcurrencyPolicy()` only implements skip and cancel behavior in `src/main/cron/scheduler/cron-scheduler.ts:698`. `queueIfRunning` currently proceeds while a previous task is still active, which is overlap rather than queueing.

Impact:

- Users and tests can believe queueing exists when it does not.
- `cancelPrevious` and `replacePrevious` share the same behavior.

Recommended direction:

- Either implement real queue semantics or remove/disable unsupported policies.
- Add behavior tests for every accepted concurrency policy.

### 5. Retry Policy Fields Are Not Honored

`createTaskWithRetry()` catches every error and retries until `maxAttempts` in `src/main/cron/scheduler/cron-scheduler.ts:732`. It does not inspect `retryableErrorCodes`, `nonRetryableErrorCodes`, or a typed error's retryable flag.

Impact:

- Validation or permission failures can be retried when they should fail fast.
- Retry settings look more expressive than the runtime behavior.

Recommended direction:

- Convert runner errors into typed scheduler errors before retry decisions.
- Retry only errors explicitly classified as retryable.

### 6. Time Semantics Need Stronger Tests

`CronNextRunCalculator` is a hand-rolled cron evaluator in `src/main/cron/scheduler/cron-next-run-calculator.ts:88`. It supports the local cron syntax implemented by `parseCronExpression`, but `CronRunPolicy.dstPolicy` is not applied. `fixedDelay` depends on `lastSuccessfulRunAt`, but the managed scheduler only updates `lastRunAt` when it creates a task.

Impact:

- DST policies are modelled but not behaviorally enforced.
- Fixed-delay naming suggests delay after completion, but the scheduler only observes task creation.
- Calendar/manual types are accepted by the model but return no next run.

Recommended direction:

- Add DST and boundary tests before changing calculator behavior.
- Decide whether fixed-delay means delay after task creation or task success; encode that in types/tests.
- Reject or document non-executable schedule types at create time.

### 7. Store Migration Is Too Permissive

`migrateCronStoreState()` filters arrays by object shape only and casts the result in `src/main/cron/store/cron-store-migrations.ts:21`. The state includes a `quarantined` collection, but invalid records are not normalized into it.

Impact:

- Bad persisted data can reach recovery and fail at runtime.
- There is no durable audit trail for discarded or quarantined schedule records.

Recommended direction:

- Validate migrated schedules, events, executions, and locks.
- Quarantine invalid records with enough metadata for diagnostics.

### 8. Delivery Needs Production Boundaries

Friday webhook delivery validates only HTTP(S) URLs, then calls `fetch()` without an abort timeout or network policy in `src/main/cron/friday/runtime-adapters.ts:217`. Friday run logs and managed schedule events/executions also append without retention limits.

Impact:

- A recurring job can hang on a webhook request until the platform times out.
- Webhook delivery can become an SSRF-style egress surface.
- Long-running installs can grow store state without bounds.

Recommended direction:

- Wrap webhook delivery in a delivery adapter with URL policy, timeout, size limits, and retry classification.
- Add retention limits for runs, events, and executions.

### 9. Friday Scheduler Global Concurrency Can Be Exceeded

`processDue()` slices due jobs with `Math.max(1, maxConcurrentRuns - this.running)` in `src/main/cron/friday/scheduler.ts:448`. When `this.running >= maxConcurrentRuns`, it still allows one more due job.

Impact:

- Global concurrency limits are not strict under concurrent manual and automatic runs.

Recommended direction:

- Use zero available slots when the scheduler is already at capacity.
- Add tests for manual run plus due processing and multiple due jobs.

## Test Plan

### Phase 1: Lock Current Behavior

Run before making runtime changes:

```bash
npm test -- --selectProjects main tests/unit/main/cron
npm run typecheck:node
```

Add characterization tests for the current quirks before refactoring:

- `queueIfRunning` currently overlaps instead of queueing.
- `requiresConfirmation` currently does not block create/update.
- legacy `cron_add` persists arbitrary `CronTaskData`.
- Friday global concurrency currently starts one due job even when at capacity.

These tests should be rewritten or removed as each behavior is fixed.

### Phase 2: Access And Confirmation Tests

Add unit tests around `DefaultCronScheduleAccessPolicy` and scheduler entry points:

- actor without `createSchedule` cannot create a schedule;
- actor without `updateSchedule`, `deleteSchedule`, `pauseSchedule`, `resumeSchedule`, or `runScheduleNow` cannot perform that action;
- non-admin list calls require `actor.userId`;
- non-admin list/get/run/update/delete cannot cross `ownerUserId`;
- `requiredPermissions` require matching actor grants;
- `requiresConfirmation: true` without `confirmed: true` returns or throws a confirmation result;
- expired confirmation cannot be used;
- confirmation state survives store round trips if confirmation remains a persisted concept.

Add IPC tests:

- `ownerUserId` spoofing in create requests does not change the trusted actor;
- list/update/delete calls with no trusted user fail closed;
- renderer cannot call legacy add/remove unless explicitly allowed.

### Phase 3: Schedule Semantics Tests

Add focused tests for `CronNextRunCalculator` and `validateScheduleShape`:

- cron day-of-month plus day-of-week behavior;
- leap day and month-end schedules;
- Europe/Rome DST missing hour and repeated hour;
- invalid timezone rejection;
- one-time schedules due in the past during startup;
- `calendar` and `manual` create behavior is either rejected or documented as non-executable;
- fixed-rate, interval, and fixed-delay behavior around `lastRunAt`, `lastSuccessfulRunAt`, `startAt`, and `endAt`.

### Phase 4: Execution, Retry, And Concurrency Tests

Add managed scheduler tests with fake runners and fake clock control:

- retryable runner error retries with backoff;
- non-retryable runner error fails without retry;
- failed task creation records one execution with safe error metadata;
- lock contention skips without creating a task;
- duplicate execution idempotency suppresses duplicate task creation;
- `skipIfRunning` records a skipped execution and advances next run;
- `queueIfRunning` queues one follow-up run or is rejected at validation;
- `cancelPrevious` and `replacePrevious` have distinct documented behavior;
- `maxRunsPerTurn` caps catch-up and due processing.

Add Friday scheduler tests:

- `maxConcurrentRuns` is strict when manual and automatic runs overlap;
- stuck run recovery records an error and schedules backoff;
- one-shot retry attempts stop at `maxAttempts`;
- recurring errors back off and failure alerts respect cooldown;
- run logs honor retention limits after retention is implemented.

### Phase 5: Store And Recovery Tests

Add migration and recovery coverage:

- malformed schedules are quarantined instead of cast into runtime state;
- invalid locks are dropped;
- corrupted execution/event records are dropped or quarantined;
- recovery emits safe events without leaking task input;
- disabled schedules are not recovered as active;
- `CRON_ENABLED=false` and `SKIP_CRON=1` persist schedules but do not arm timers.

### Phase 6: Delivery Tests

Add adapter tests for Friday delivery:

- webhook delivery aborts on timeout;
- non-HTTP(S), loopback, link-local, or otherwise disallowed destinations are rejected according to the chosen URL policy;
- `bestEffort` delivery failures record failed delivery without failing the run;
- non-best-effort delivery failures fail the run;
- Telegram delivery uses the channel registry idempotency key;
- event-bus delivery records `skipped` when no bus is available.

### Phase 7: Integration And UI Tests

Add integration tests around the full service graph:

- managed schedule creates a visible background `agent.run` task through `TaskManagerCronScheduleRunner`;
- Friday `agentTurn` creates a background task and returns its result;
- Friday main-session `systemEvent` routes through heartbeat when available;
- schedules survive app restart and recover missed runs;
- renderer create/list/pause/resume/delete flows preserve owner boundaries;
- cron events are broadcast without leaking stored task input.

Add one end-to-end smoke test after the lower-level tests are stable:

- create a recurring reminder from the UI;
- verify it appears in the schedule list;
- force-run it;
- verify a task record or run record appears;
- pause and delete it.

## Refactor Guardrails

- Prefer one primary public cron facade for new work: the Friday `cron` tool or managed scheduler, not legacy `cron_add`.
- Keep ports small: access policy, schedule store, task runner, delivery adapter, clock/timer.
- Do not add a dependency injection container; compose these ports where `CronService` already wires runtime dependencies.
- Do not expand scheduled payload shape beyond `agent.run` messages unless authorization, confirmation, and redaction are implemented first.
- If a policy is not implemented, reject it at validation rather than accepting a misleading value.

