# AgentApi Preload Prompt

Expose agent interaction through `window.agent`. This API is the renderer-safe bridge to `AgentService`; it must not expose the service instance or internal agent runtime details.

## Expose

- Send a user message to the active agent run.
- Reset the active agent session.
- Cancel the active agent run.
- Read renderer-safe agent history.
- Open the agent history folder from the main process.
- List editable agent startup files.
- Read one editable startup file.
- Write one editable startup file.
- Subscribe to streamed agent response events.

## Dependencies

- Shared agent request, response, history, event, and workspace-file types.
- Typed agent invoke channels for commands and queries.
- Typed agent event channels for streamed responses.
- A main-process handler that delegates to `AgentService`.
- Startup-file access owned by the main process.
- History folder access owned by the main process.
- Event broadcasting owned by the main process.

## Rules

- Use invoke-style calls for commands and queries.
- Use subscription-style calls for response events.
- Convert transcript entries to renderer-safe history before returning them.
- Keep provider resolution, transcript persistence, tool execution, startup-file safety, and filesystem access out of preload.
- Keep workspace-file identity and safety decisions in the main process.
- Return unsubscribe functions from response subscriptions.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run renderer checks when renderer consumers change.
- Run focused main-process or renderer tests when behavior changes.
