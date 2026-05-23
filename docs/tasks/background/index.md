# Background Tasks

Background tasks run agent work outside the active foreground conversation while still using Friday's normal agent, provider, session, and tool runtime.

## Functionality

- Accepts immediate agent work requests.
- Validates task type, payload shape, size, and secret-like content.
- Runs each accepted task in an isolated task session.
- Tracks lifecycle state in memory.
- Supports cancellation.
- Broadcasts task events to the renderer.

## Execution Flow

1. A renderer action, tool call, or scheduler asks the task manager to create a task.
2. Background task policy decides whether the requested type is allowed.
3. The task registry resolves the handler for the approved task type.
4. The `agent.run` handler validates that the payload contains only a usable message.
5. The task manager records the task and marks it queued or running.
6. The agent service runs the message in a task-specific session.
7. Completion, failure, or cancellation updates the task record and broadcasts an event.

## State

Task records are in-memory runtime records. They contain identifiers, task type, sanitized input, timestamps, status, result or error metadata, and cancellation state.

Provider and model settings are resolved when the task runs. They are not copied into the task payload.

## Cancellation

Cancellation changes the task state to cancelling and asks the agent service to abort the matching task session. If the agent exits because of the abort, the task becomes cancelled. If it finishes first, the final completed state is preserved.
