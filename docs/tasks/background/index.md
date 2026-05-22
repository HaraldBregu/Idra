# Background Tasks

Background tasks are immediate units of work that can run while Friday remains
usable. They are for operations that may take noticeable time, such as an agent
run, image generation, OCR, speech work, video generation, audio generation,
embedding work, connector sync, a network request, or a local operation.

## Purpose

A background task gives the user a visible lifecycle for work that starts now.
The user should be able to see that the work exists, follow its progress,
retrieve its result, and request cancellation when the task is still running.

Background tasks are not schedules. They do not decide when future work should
run, and they do not restore task entries after the app restarts.

## Expected Behavior

- Start approved task categories only.
- Run more than one task at the same time when resources allow it.
- Create one task entry for each operation.
- Keep task state available for the current app session.
- Report meaningful progress when the underlying work can provide it.
- Finish only when the work succeeds, fails, is cancelled, or the app exits.
- Never complete, fail, or cancel a task just because a default timeout elapsed.

## Lifecycle

Each task should move through a clear lifecycle:

1. The task is created and waiting to start.
2. The task starts running.
3. The task may publish progress updates.
4. The task finishes successfully, fails with a user-safe error summary, or
   stops because cancellation was requested.

Cancellation should be cooperative. Friday should ask the running work to stop,
and the work should stop at the next safe checkpoint. Cancellation should not
corrupt partial output, leave provider calls unmanaged, or change the result of
an already finished task.

## User-Visible State

A task entry should show enough information for the user to understand what is
happening:

- A stable identifier.
- A human-readable title.
- The task category.
- The current status.
- Creation, start, and finish times when available.
- Progress details when available.
- A sanitized result summary after success.
- A sanitized error summary after failure.

Task entries should not store secrets, raw credentials, full provider
configuration, large unbounded outputs, or private payloads that are not needed
by the user.

## Starting Tasks

The app and agent actions may start only approved task categories. Before work
begins, Friday should validate the requested category and input, trim or
normalize user-provided values, and reject secret-looking payloads.

User input should describe the requested work. Provider selection, model
selection, credentials, service connections, and other runtime details should
come from the app's existing configuration, not from the task request.

## Agent Work

An agent run can be executed as a background task. It should behave like any
other task: one visible entry, progress updates, cancellation support, and a
bounded result summary.

The task input should contain the message or instruction to run. Optional run
preferences may be accepted when they refer to configured choices, but the task
must not accept credentials, provider configuration, base URLs, or secret
values.

When cancelled, the running agent should be asked to stop through its normal
cancellation path. If cancellation completes first, the task should be marked as
cancelled. If the agent fails first for a non-cancellation reason, the task
should show a normal failure.

## Module-Backed Work

Media, OCR, embedding, connector, and similar work should be thin task wrappers
around the feature that already performs that work. The task owns lifecycle
state. The feature owns execution details.

For example, an image task should receive a sanitized prompt and image options.
The image workflow should then choose the configured provider and model, run the
generation, and return a bounded result summary.

This keeps task input stable and safe. It also prevents provider credentials or
configuration details from being copied into task payloads.

## Progress And Results

Progress should be useful but small. A task may report steps, counts, or short
messages. It should not stream private request bodies, raw provider responses,
or large generated artifacts into the task entry.

Results should be summaries or references to saved output, not unbounded
payloads. Errors should explain what failed without exposing secrets.

## Timeout Rule

Background tasks should not have a default execution timeout. Long-running work
may continue as long as the app is running and the user has not cancelled it.

If an external service or local worker has its own timeout, that timeout
belongs to that service or worker. The background task should report the
resulting error as a normal task failure instead of enforcing a separate global
deadline.

## Acceptance Criteria

- Multiple background tasks can run at the same time and finish independently.
- A user can start an approved task category from the app.
- A user can list current-session tasks and open a specific task entry.
- A user can cancel a running task.
- Cancelling the same task more than once is safe.
- Finished, failed, and cancelled tasks remain visible until the app session
  ends.
- Task input, progress, results, and errors are sanitized and size-bounded.
- Provider and model decisions stay inside the feature that performs the work.
