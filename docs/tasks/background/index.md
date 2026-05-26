# Background Tasks

Background tasks run agent work outside the active foreground conversation while still using Friday's normal agent, provider, session, and tool runtime.

## Functionality

- Accepts immediate agent work requests.
- Validates task type, payload shape, size, and secret-like content.
- Runs each accepted task in an isolated task session.
- Tracks sanitized lifecycle state in memory and in `task.json`.
- Supports cancellation.
- Broadcasts task events to the renderer.

## Execution Flow

1. A renderer action, tool call, or scheduler asks the task manager to create a task.
2. Background task policy decides whether the requested type is allowed.
3. The tasks service resolves the handler for the approved task type.
4. The `agent.run` service behavior validates that the payload contains only a usable message.
5. The tasks service records the task and marks it queued or running.
6. The agent service runs the message in a task-specific session.
7. Completion, failure, or cancellation updates the task record and broadcasts an event.

## State

Task records are sanitized runtime records persisted in Electron Store as `task.json`. They contain identifiers, task type, title, provider/model ids, timestamps, status, progress, caller metadata, result, and public error metadata.

The persisted records do not contain task input, handlers, promises, abort controllers, listeners, provider clients, or secrets. If Friday starts with a persisted queued, running, or cancelling task record, the tasks service marks it failed with `TaskInterrupted` because the live execution state cannot be restored from disk.

Provider and model settings are resolved when the task runs. They are not copied into the task payload.

## Cancellation

Cancellation changes the task state to cancelling and asks the agent service to abort the matching task session. If the agent exits because of the abort, the task becomes cancelled. If it finishes first, the final completed state is preserved.
