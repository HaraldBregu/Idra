# Tasks

Tasks let Friday run agent work without blocking the foreground conversation. The main process currently supports immediate background agent tasks and persisted scheduled tasks.

## Task Families

| Family | Functionality | How It Works |
| --- | --- | --- |
| Background task | Starts agent work immediately. | A request creates an in-memory task record, validates the task type and payload, runs an isolated agent session, tracks status, and emits lifecycle events. |
| Scheduled task | Starts agent work when a schedule is due. | A persisted schedule is recovered at startup, evaluated by the scheduler, and converted into a background task when it should run. |

## Background Execution

The user-facing task type is `agent.run`. Its payload contains a message for the agent. The task handler rejects empty messages, oversized messages, unsupported fields, and secret-looking content.

When accepted, the task receives its own task id and an isolated session id. The agent service resolves the current provider and model from settings at execution time. Task state moves through queued, running, cancelling, succeeded, failed, or cancelled.

## Scheduling

Scheduled tasks are owned by the cron service. Managed schedules persist schedule definitions in settings, recover them at startup, validate access policy and frequency, and create background agent tasks when due.

Friday cron jobs provide a richer tool-facing scheduler for agent turns, system events, wake requests, run history, and delivery routing. Legacy cron jobs are retained for compatibility.

## Safety And State

Task records are runtime state and are not the same as schedule definitions. Schedules should not contain provider credentials or copied secrets. Cancellation asks the agent service to cancel the task session and updates task state through the task manager.
