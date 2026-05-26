# AgentApi Preload Prompt

Expose agent interaction through `window.agent`. `AgentApi` is the renderer-safe bridge to `AgentService`; it must not expose `agentService` itself.

## Expose

- `send(message, options)`: send a user message to the active agent run.
- `reset()`: reset the active agent session.
- `cancel()`: cancel the active agent run.
- `getHistory()`: read renderer-safe agent history.
- `openHistoryFolder()`: open the agent history folder from the main process.
- `listWorkspaceFiles()`: list editable agent startup files.
- `readWorkspaceFile(name)`: read one startup file.
- `writeWorkspaceFile(name, content)`: write one startup file.
- `onResponse(callback)`: subscribe to streamed agent response events.

## Dependencies

- Shared types: `src/shared/agents/service.ts`.
- Channels: `AgentChannels`, `AgentInvokeChannelMap`, and `AgentEventChannelMap` in `src/shared/ipc-channels/index.ts`.
- Preload interface: `AgentApi` in `src/preload/index.d.ts`.
- Preload implementation: `agent` in `src/preload/index.ts`.
- Main IPC: `src/main/ipc/agent-ipc.ts`.
- Main services: `agentService`, `startupFiles`, `userDataDirectory`, `logger`, and `eventBus`.

## Rules

- Use `typedInvokeUnwrap` for commands and queries.
- Use `typedOn(AgentChannels.response, callback)` for response events.
- Convert transcript entries to renderer-safe history in main IPC or service code.
- Keep provider resolution, transcript persistence, tool execution, startup-file safety, and filesystem access out of preload.
- Use `DEFAULT_AGENT_ID` only in the main-process workspace-file dependency path.

## Verification

- Run `yarn typecheck:node` for shared, preload, or IPC type changes.
- Run `yarn typecheck:web` when renderer consumers change.
- Run focused main or renderer tests when behavior changes.
