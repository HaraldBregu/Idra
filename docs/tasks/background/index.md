# Background Tasks

Background tasks are immediate agent runs that continue while Friday remains
usable. They are for agent work that may take noticeable time and should not
block the rest of the app.

Only agent work should run as a background task. Other feature work should use
its own flow unless an agent task is coordinating that work.

## Purpose

A background task gives the user a visible lifecycle for an agent run that
starts now. The user should be able to see that the agent run exists, follow
its progress, retrieve its result, and request cancellation while it is still
running.

Background tasks are not schedules. They do not decide when future work should
run, and they do not restore task entries after the app restarts.

## Expected Behavior

- Start only approved agent background tasks.
- Run multiple background tasks in parallel when resources allow it.
- Give each background task its own agent session.
- Use the app's configured provider and model settings for the run.
- Create one task entry for each agent run.
- Keep task state available for the current app session.
- Report meaningful progress when the agent run can provide it.
- Finish only when the agent succeeds, fails, is cancelled, or the app exits.
- Never complete, fail, or cancel a task just because a default timeout elapsed.

## Lifecycle

Each background task should move through a clear lifecycle:

1. The task is created and waiting to start.
2. The agent session starts running.
3. The task may publish progress updates.
4. The task finishes successfully, fails with a user-safe error summary, or
   stops because cancellation was requested.

Cancellation should be cooperative. Friday should ask the running agent session
to stop, and the session should stop at the next safe checkpoint. Cancellation
should not corrupt partial output or change the result of an already finished
task.

## User-Visible State

A task entry should show enough information for the user to understand what is
happening:

- A stable identifier.
- A human-readable title.
- The current status.
- Creation, start, and finish times when available.
- Progress details when available.
- A sanitized result summary after success.
- A sanitized error summary after failure.

Task entries should not store secrets, raw credentials, full provider
configuration, large unbounded outputs, or private payloads that are not needed
by the user.

## Starting Tasks

The app and agent actions may start approved agent background tasks. Before work
begins, Friday should validate the instruction, trim or normalize user-provided
values, and reject secret-looking payloads.

The starting request should describe what the agent should do. Provider
selection, model selection, credentials, service connections, and other runtime
details should come from the app's central configuration, not from the task
request.

## Agent Sessions

Each background task should run in its own agent session. This keeps parallel
tasks isolated from one another and prevents one background run from mixing its
conversation state with another run.

The task may accept safe run preferences when they refer to configured choices,
but it must not accept credentials, provider configuration, base URLs, or secret
values. If no safe preference is provided, Friday should use the current
configured defaults.

When cancelled, the running session should be asked to stop through its normal
cancellation path. If cancellation completes first, the task should be marked as
cancelled. If the agent fails first for a non-cancellation reason, the task
should show a normal failure.

## Agent Tool

Background task creation can also be exposed as a tool for the agent. The tool
should let an agent start a separate agent run in the background when the work
does not need to block the current response.

The tool should create a normal background task entry and return enough
information for the user or calling agent to track it. It should not expose
arbitrary execution, non-agent task categories, credentials, or low-level
runtime configuration.

## Progress And Results

Progress should be useful but small. A task may report steps, counts, or short
messages. It should not stream private request bodies, raw provider responses,
or large generated artifacts into the task entry.

Results should be summaries or references to saved output, not unbounded
payloads. Errors should explain what failed without exposing secrets.

## Timeout Rule

Background tasks should not have a default execution timeout. Long-running
agent work may continue as long as the app is running and the user has not
cancelled it.

If an external service involved in the agent run has its own timeout, that
timeout belongs to that service. The background task should report the
resulting error as a normal task failure instead of enforcing a separate global
deadline.

## Acceptance Criteria

- Multiple background agent tasks can run at the same time and finish
  independently.
- Each background task has its own agent session.
- Provider and model choices come from app configuration, not task payloads.
- A user can start an approved agent background task from the app.
- An agent can start an approved agent background task through the background
  task tool.
- A user can list current-session tasks and open a specific task entry.
- A user can cancel a running task.
- Cancelling the same task more than once is safe.
- Finished, failed, and cancelled tasks remain visible until the app session
  ends.
- Task input, progress, results, and errors are sanitized and size-bounded.
