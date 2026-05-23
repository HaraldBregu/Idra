# Background Tasks

Background tasks are immediate agent runs that continue while Friday remains
usable. They provide a visible lifecycle for work that starts now and may take
noticeable time.

## Functionality

The current user-facing background task type is `agent.run`. It runs one agent
instruction in an isolated task session and keeps the task record available for
the current app session.

Only approved task types can be started from the renderer. The background task
policy can further restrict which task types are allowed.

## Creation

Task creation validates the task type, title, optional id, input, and metadata.
Duplicate caller-provided ids are rejected. Metadata is sanitized before it is
stored on the task record.

For `agent.run`, input must be an object with only a `message` field. The
message must be non-empty, size-bounded, and free of secret-looking content.
Provider ids, model ids, credentials, base URLs, and other runtime config are
not accepted in task input.

## Lifecycle

Background task records use this lifecycle:

1. `queued`: the record exists and is waiting for the handler to start.
2. `running`: the handler is active.
3. `cancelling`: cancellation has been requested while the handler is running.
4. `succeeded`: the handler completed and stored a sanitized result.
5. `failed`: the handler threw a non-cancellation error and stored a safe error.
6. `cancelled`: cancellation completed before the task finished.

Terminal records stay visible until the app session ends.

## Agent Execution

An agent task uses a session id derived from the task id. This keeps background
task transcripts isolated from the main chat and from other background tasks.

Before the agent starts, the task reads the current assistant provider and model
selection from the store. The task then calls the normal agent execution path
with the isolated session id.

The task publishes short progress messages such as start and completion. The
successful result stores the final text returned by the agent after task-value
sanitization.

## Cancellation

Each task owns an abort controller. Cancelling a queued task moves it directly
to `cancelled`. Cancelling a running task marks it as `cancelling`, aborts the
controller, and asks the matching agent session to cancel.

Cancelling an already terminal task is safe and returns the existing record.
If a non-cancellation error wins the race before cancellation completes, the
task fails normally.

## Sanitization

Task metadata, progress, results, and errors are size-bounded and scrubbed for
secret-looking keys and values. Binary or deeply nested payloads are reduced to
small safe summaries.

Task records should contain enough state for the user to understand what
happened, but not raw credentials, full provider configuration, private request
bodies, or unbounded generated output.
