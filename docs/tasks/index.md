# Tasks

Tasks are agent runs Friday can handle without blocking the rest of the app.
The current task runtime has two families: immediate background tasks and saved
scheduled work that creates background tasks when due.

## Task Families

| Area | Functionality | How it works |
| --- | --- | --- |
| Background tasks | Run an agent instruction now while the app remains usable. | A task handler validates the request, creates an in-memory task record, starts an isolated agent session, emits lifecycle events, tracks progress, and stores a sanitized result or error for the current app session. |
| Scheduled tasks | Save future, delayed, or recurring agent work. | The scheduler stores timing rules and a sanitized agent instruction. When a run is due, it creates a normal background task rather than executing the agent directly. |

## Background Task Runtime

The user-facing task type is `agent.run`. Its input accepts only a `message`
field. The message is trimmed, must be non-empty, is size-bounded, and is
rejected when it contains secret-looking content.

Task records move through `queued`, `running`, `cancelling`, `cancelled`,
`succeeded`, and `failed`. Results, errors, progress, and metadata are sanitized
and cloned before they are exposed.

Each agent task uses a task-specific session id so parallel background runs do
not share transcript state. Provider and model settings are resolved from the
store when the task starts.

## Scheduled Task Runtime

Scheduled work is owned by the cron module. Managed schedules validate timing,
ownership, frequency, and payload safety before storage. Due managed schedules
create `agent.run` background tasks through the task manager.

Friday cron jobs power the agent-facing cron tool. They can add, update, list,
run, remove, and wake jobs, then execute agent turns or system events according
to the stored payload and delivery settings.

Legacy cron task records remain supported for compatibility.

## Events And Renderer Access

Task lifecycle changes are emitted on the main event bus and forwarded to the
renderer. The renderer can start approved user-facing task types, list current
records, read one record, cancel a running task, and subscribe to task events.

Task records are not persisted across app restarts. Schedules are persisted;
the background task records they create exist only for the current app session.

## Safety Rules

- Task and schedule input should describe the user goal, not runtime provider
  credentials or model configuration.
- Provider and model selection must be resolved through the store at run time.
- Credentials, tokens, API keys, base URLs, and raw provider records must not
  be stored in task input or schedule payloads.
- Cancellation is cooperative and should call the active agent session's normal
  cancellation path.
- Schedulers should not be emulated with sleep loops, shell loops, or polling
  loops.
- Elapsed time alone should not silently complete, fail, or cancel a background
  task.
