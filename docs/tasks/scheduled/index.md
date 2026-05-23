# Scheduled Tasks

Scheduled tasks are saved instructions for future or recurring agent work. The
scheduled record owns timing; the background task owns agent execution once the
schedule becomes due.

## Functionality

The cron module supports three scheduling paths:

- Managed schedules for persisted agent task scheduling with events, locks,
  access policy, missed-run recovery, and execution records.
- Friday cron jobs for the agent-facing cron tool, wake events, delivery
  routing, and direct or task-backed agent execution.
- Legacy cron tasks for older persisted `node-cron` jobs.

All scheduled agent work should store only the sanitized instruction and timing
metadata. Provider and model selection are resolved through the store when the
created background task or direct cron agent run starts.

## Managed Schedule Flow

Creating or updating a managed schedule validates the actor, timing shape,
frequency, stored payload, and task type. Scheduled agent work must create an
`agent.run` background task and its input must contain only a safe `message`.

When the scheduler starts, it reloads schedules and recovers startup state. A
polling loop checks due schedules, acquires schedule locks, avoids duplicate
run creation, and asks the schedule runner to create a background task for each
due occurrence.

Managed schedules record safe events and executions so the UI can inspect what
happened without exposing credentials or raw provider configuration.

## Friday Cron Flow

Friday cron powers the `cron` tool. It can report status, list jobs, read one
job, add jobs, update jobs, remove jobs, run a job now, list previous runs, and
wake the scheduler.

Jobs can represent agent turns or system events. They can also carry delivery
instructions so output can be routed through the channel gateway. Failure
delivery is separated from normal output delivery.

Friday cron enforces actor visibility. Owners can manage all visible jobs,
while scoped actors are limited to their own job or session context.

## Timing

Schedules can use one-time, interval, or cron-style timing. Cron expressions are
interpreted in the configured timezone as local wall-clock time. Next-run
calculation handles recurrence, disabled schedules, one-shot completion, and
missed-run policy.

Startup recovery is bounded. Friday should not create unlimited background
tasks after a long offline period.

## Concurrency And Idempotency

Schedulers avoid starting the same scheduled run twice. Locks and idempotency
keys prevent duplicate processing for the same due occurrence.

If a schedule becomes due while a previous run from the same schedule is still
active, the schedule policy decides whether to skip, wait, or cancel existing
work. The default behavior is conservative and avoids overlap.

## Safety

Scheduled payloads must not contain API keys, tokens, authorization headers,
provider configs, model configs, base URLs, endpoint URLs, private keys, or
other credential-shaped values.

Schedules should never run arbitrary non-agent work. Future, recurring,
delayed, reminder, wake, and calendar-style requests should use scheduling.
Immediate work should use background tasks.
