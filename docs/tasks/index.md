# Tasks

Tasks are units of work Friday can run without blocking the rest of the app.
They cover immediate background agent runs, work scheduled for later, and work
created by a schedule when it becomes due.

## Task Families

Friday uses two task families:

| Area | When to use it | How it should behave |
| --- | --- | --- |
| [Background tasks](background/index.md) | An agent run should start now and continue while the app remains usable. | Create one visible agent task, run it in its own session, use configured provider and model settings, report progress, allow cancellation, and keep the result available for the current session. |
| [Scheduled tasks](scheduled/index.md) | Work should happen in the future, repeat over time, or run after a delay. | Persist the schedule, calculate due times, handle missed runs, and create work only when the schedule is due. |

## Responsibilities

Background tasks own immediate agent execution. They track the current state of
a running agent session, keep that session isolated from other background
tasks, and expose the task state to the user.

Scheduled tasks own timing. They decide when work is due, what should happen if
the app was closed or asleep, and whether another run may start while a previous
one is still active.

The feature that performs the actual work owns its own provider, model,
connection, and runtime decisions. Task input should describe what the user
wants done, not carry credentials or low-level provider configuration.

## How They Work Together

A schedule may create a background task when it fires if the due work is an
agent run. The background task should start a separate agent session and use
the app's configured provider and model settings.

Immediate agent runs should use background tasks directly. Future, recurring,
delayed, reminder, wake, and calendar-style requests should use scheduled
tasks.

Background task creation may also be exposed as an agent tool. When an agent
uses it, Friday should create a normal visible background task instead of
running arbitrary non-agent work.

## Safety Rules

- Keep secrets out of task and schedule input.
- Keep only sanitized progress, result, and error summaries.
- Create one visible task per agent run unless the user or agent intentionally
  starts multiple runs.
- Make cancellation safe and repeatable.
- Do not use sleep loops, polling loops, or long-running timers as a substitute
  for scheduling.
- Do not let elapsed time alone silently complete, fail, or cancel a background
  task.
