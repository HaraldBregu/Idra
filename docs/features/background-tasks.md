# Background Tasks

Background tasks let Friday run agent work outside the active foreground conversation.

## Functionality

- Creates task records with queued, running, cancelling, cancelled, succeeded, or failed status.
- Supports immediate user-facing tasks and internal task creation.
- Enforces optional allowed task type policy.
- Supports configurable concurrency.
- Sanitizes metadata, progress, errors, and secret-looking values before recording them.
- Broadcasts task lifecycle events to the renderer.
- Supports cancellation through `AbortController`.

## Available Task Types

`agent.run` is the user-facing background task type. It accepts a single `message`, validates that the message is non-empty, rejects oversized content, rejects unsupported fields, and blocks secret-looking content. It runs the message through the main agent service in an isolated `task:<taskId>` session.

`subagent.run` is used by subagent spawning. It runs an isolated child agent session with child metadata, optional provider/model overrides, optional timeout, inherited tool allow/deny lists, and cancellation support.

## State Model

Task records are in-memory runtime state. They are separate from persisted cron schedule definitions. Provider and model settings are resolved at execution time instead of being copied into the task payload.

## Source

- `src/main/tasks`
- `src/main/tasks/handlers/agent-task-handler.ts`
- `src/main/agent/subagents/task-handler.ts`
- `src/shared/tasks.ts`
- `src/renderer/src/pages/settings/pages/task-manager`
- Existing docs: `docs/tasks/index.md`, `docs/tasks/background/index.md`

