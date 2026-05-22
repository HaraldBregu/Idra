# Scheduled Tasks

Scheduled tasks are work definitions that should run later, repeat over time,
or wait for a specific condition before creating work. The scheduler owns when
work is due. The feature that performs the work owns how the work executes.

## Purpose

Use scheduled tasks for reminders, recurring jobs, delayed work, wake actions,
maintenance, connector sync, scheduled agent turns, and any request where the
important part is when the work should happen.

The scheduler should persist schedules so they survive app restarts. It should
recover active schedules on startup, calculate the next due time, and decide
what to do when a run was missed while the app was unavailable.

## Expected Behavior

- Persist schedule definitions and execution history.
- Validate who is allowed to create or modify a schedule.
- Validate schedule frequency so one schedule cannot overload the app.
- Reject schedule input that appears to contain secrets.
- Calculate the next run in the schedule's timezone.
- Detect due schedules on a regular cadence.
- Avoid duplicate runs for the same due time.
- Apply missed-run, concurrency, and retry rules.
- Record user-safe audit and execution events.
- Create or dispatch the scheduled work only when it is due.

## Schedule Creation

Creating a schedule should collect the information needed to answer four
questions:

- What should this schedule be called?
- When should it run?
- Who owns it?
- What sanitized work should be created when it becomes due?

Friday should validate the request, apply safe defaults, calculate the first
run when the schedule can run automatically, persist the schedule, and make the
schedule visible to the owner.

Agent-created schedules should be attributed to the agent session that created
them. User-created schedules should be attributed to the current user context.

## Schedule Shapes

Scheduled work may use several timing shapes:

- Cron schedules run on calendar patterns such as every Monday at 09:00.
- Interval schedules run after a repeated duration.
- Fixed-rate schedules use a stable anchor time so runs stay aligned to the
  original cadence.
- Fixed-delay schedules wait until the previous run has finished before
  counting the next delay.
- One-time schedules run once at a specific time.
- Manual or calendar-backed schedules may be stored even when they do not
  automatically produce a next run yet.

Cron schedules should use the schedule timezone. Interval and delay schedules
should use the last relevant run time so repeated work stays predictable.
Schedules that are disabled, deleted, past their end time, or past their
maximum run count should not produce another automatic run.

## Defaults

Safe defaults should favor predictable behavior:

- New schedules are enabled unless the creator explicitly disables them.
- Schedules are visible to their owner.
- Missed runs are skipped unless another policy is selected.
- Overlapping runs are skipped unless another concurrency policy is selected.
- Retry behavior is conservative and bounded.
- Optional metadata starts empty.
- Timezone comes from the request or the current actor context.

## Due Processing

The scheduler should recover schedules on startup and check for due work on a
regular cadence. A default cadence of about 30 seconds is acceptable for normal
scheduled work.

When a schedule is due, Friday should:

1. Confirm the schedule is still active and allowed to run.
2. Lock the schedule while this due time is being processed.
3. Ignore duplicate processing for the same scheduled time.
4. Apply the schedule's concurrency rule.
5. Create or dispatch the scheduled work.
6. Record the execution attempt.
7. Update the run count and last run time.
8. Calculate the next run or mark the schedule complete.

## Module-Backed Work

A schedule should store the task category and sanitized task input needed to
create work later. It should not store provider credentials, raw provider
records, webhook secrets, base URLs, or other private runtime details.

When a schedule fires, the target feature should resolve its own provider,
model, endpoint, credentials, and runtime dependencies from current app
configuration.

Example behavior: a weekly image schedule stores a prompt, aspect ratio, count,
and timing rules. When the schedule fires, Friday creates image work from that
sanitized input. The image workflow then chooses the configured provider and
model and saves the generated output.

## Missed Runs

When Friday starts and a schedule's next run is already in the past, the
selected missed-run policy should decide what happens:

- Skip missed runs and move to the next future run.
- Run one missed occurrence.
- Catch up on missed occurrences within a bounded window.
- Mark the schedule failed.
- Ask the user before proceeding.

Catch-up behavior must be bounded so a long offline period cannot create an
unlimited number of runs.

## Concurrency

When a schedule is due while earlier work from the same schedule is still
running, the selected concurrency policy should decide what happens:

- Allow the new run to overlap.
- Skip the new run and move to the next due time.
- Queue the new run behind the current one.
- Cancel the previous run before starting the new one.
- Replace the previous run with the new one.

The default should avoid overlap.

## Retry Behavior

Retries should be explicit, bounded, and auditable. A failed scheduled run may
retry only according to the schedule's configured retry policy. Retrying should
not create unbounded loops or hide the final failure from the user.

## Agent And Reminder Schedules

Agent-created schedules should store a compact, sanitized instruction for the
future run. Reminder schedules should store the reminder text and timing rules.
Neither should store credentials, provider configuration, or private runtime
objects.

When the schedule fires, Friday should create the corresponding work and record
what happened in a user-safe way.

## Automatic Execution

If automatic scheduling is disabled by configuration, schedules may still be
persisted and shown to the user, but timers should not run and due work should
not be created automatically. When automatic execution is enabled again, startup
recovery should apply the missed-run policy for schedules that became due while
execution was disabled.

## Acceptance Criteria

- A future schedule survives app restart.
- A recurring schedule calculates its next run in the requested timezone.
- A disabled or completed schedule does not create work.
- Missed-run policy is applied after startup recovery.
- Concurrency policy is applied when previous scheduled work is still running.
- Duplicate processing for the same due time is ignored.
- Scheduled payloads reject secret-looking values.
- Scheduled work delegates provider and model decisions to the target feature.
- Execution history and audit information are user-safe.
