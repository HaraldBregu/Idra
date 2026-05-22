# Scheduled Tasks

Scheduled tasks are background agent runs that should start later. They use the
same execution path as background tasks once they are due, but their start time
is controlled by a saved schedule.

Use scheduled tasks when an agent run should happen in the future, repeat on a
cadence, or run after a delay. Use [background tasks](../background/index.md)
when the agent run should start immediately.

## Purpose

A scheduled task stores the instruction for a future agent run plus the timing
rules for when Friday should start it. The scheduled task itself does not do the
agent work. When it becomes due, Friday creates a normal background task and
that background task runs the agent in its own session.

Provider and model selection are not stored on the scheduled task. The
background task reads the current provider and model from the store when the
agent run starts.

Schedules live in persistent app memory so they survive restarts. When Friday
starts again, it loads the saved schedules, activates the ones that are still
enabled, and checks whether any scheduled agent run is due.

## Expected Behavior

- Store the schedule, owner, title, timing rules, and sanitized agent
  instruction.
- Keep credentials, provider configuration, base URLs, and secrets out of the
  schedule payload.
- Recover enabled schedules when the app starts.
- Calculate the next due time in the schedule's timezone.
- Start a normal background task when the schedule is due.
- Resolve the provider and model from the store when the background task starts.
- Give the background task its own agent session.
- Avoid starting the same scheduled run twice.
- Record a small user-safe result or error summary for the scheduled run.

## Schedule Creation

Creating a scheduled task should answer four questions:

- What should this scheduled task be called?
- When should it run?
- Who owns it?
- What should the agent do when it runs?

Friday should validate the request, apply safe timing defaults, save the
schedule, and show it to the owner.

## Timing

Scheduled tasks may use simple timing shapes:

- One-time schedules run once at a specific time.
- Interval schedules run after a repeated duration.
- Cron schedules run on calendar patterns such as every Monday at 09:00.

Disabled, deleted, or completed schedules should not start new background tasks.

## Startup Recovery

On startup, Friday should load saved schedules before checking for due work. If a
schedule became due while the app was closed, Friday should apply a bounded
missed-run policy:

- Skip the missed run and move to the next future run.
- Run one missed occurrence.
- Ask the user before running missed work.

Startup recovery must not create an unlimited number of background tasks after a
long offline period.

## Concurrency

If a schedule becomes due while a previous background task from the same schedule
is still running, Friday should avoid overlap by default. Other policies may be
added later, but the simple default is to skip the new run and calculate the next
due time.

## Acceptance Criteria

- A scheduled agent run survives app restart.
- Startup activates saved enabled schedules.
- A due schedule creates a normal visible background task.
- The created background task runs the agent in its own session.
- Provider and model choices come from the store at run time.
- Immediate agent runs use background tasks directly.
- Scheduled payloads do not contain secrets or provider credentials.
- Duplicate processing for the same due time is ignored.
