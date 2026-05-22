# Tasks

Tasks are agent runs Friday can handle without blocking the rest of the app.
They cover immediate background agent runs and scheduled agent runs that should
start later. When a scheduled run becomes due, it creates a normal background
task.

## Task Families

Friday uses two task families:

| Area                                    | When to use it                                                                    | How it should behave                                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Background tasks](background/index.md) | An agent run should start now and continue while the app remains usable.          | Create one visible agent task, run it in its own session, read provider and model settings from the store, report progress, allow cancellation, and keep the result available for the current session. |
| [Scheduled tasks](scheduled/index.md)   | An agent run should happen in the future, repeat over time, or run after a delay. | Save the schedule, sanitized agent instruction, and timing rules; activate it on startup; and create a normal background task only when the schedule is due.                                            |

## Responsibilities

Background tasks own immediate agent execution. They track the current state of
a running agent session, keep that session isolated from other background
tasks, and expose the task state to the user.

Scheduled tasks own saved timing for future agent runs. They decide when a run
is due, what should happen if the app was closed or asleep, and whether another
run may start while a previous one is still active. They do not execute the agent
directly.

Agent execution reads provider and model settings from the store. Task and
schedule input should describe what the user wants done, not carry credentials
or low-level provider configuration.

## How They Work Together

A scheduled task creates a background task when it fires. The scheduled task
owns timing and startup recovery. The background task owns agent execution,
starts a separate agent session, and reads the current provider and model
settings from the store.

Immediate agent runs should use background tasks directly. Future, recurring,
delayed, reminder, wake, and calendar-style requests should use scheduled
tasks.

Background task creation and scheduled task creation may both be exposed as
agent tools. The background task tool creates an immediate visible background
task. The scheduled task tool saves a future or recurring agent run, which later
creates a background task when it is due. Neither tool should run arbitrary
non-agent work.

## Safety Rules

- Keep secrets out of task and schedule input.
- Read provider and model settings from the store at run time.
- Keep only sanitized progress, result, and error summaries.
- Create one visible task per agent run unless the user or agent intentionally
  starts multiple runs.
- Make cancellation safe and repeatable.
- Do not use sleep loops, polling loops, or long-running timers as a substitute
  for scheduling.
- Do not let elapsed time alone silently complete, fail, or cancel a background
  task.
