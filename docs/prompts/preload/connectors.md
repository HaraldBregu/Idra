# ConnectorsApi Preload Prompt

Expose connector configuration, OAuth, tools, and tool calls through `window.connectors`. This API is the renderer-safe bridge to connector services; it must not expose connector service instances, credentials, OAuth internals, tool gateway internals, or raw transport clients.

## Expose

- Read the connector catalog.
- List configured connectors.
- Read one connector by id.
- Add a connector.
- Update a connector.
- Remove a connector.
- Enable a connector.
- Disable a connector.
- Test a connector.
- Reconnect a connector.
- Refresh available connector tools.
- List connector tools.
- Call one connector tool with typed arguments.
- Start an OAuth connection flow.

## Dependencies

- Shared connector catalog, configuration, input, update, test-result, tool, tool-call, and OAuth-result types.
- Typed connector invoke contracts for configuration, lifecycle, tool, and OAuth operations.
- A main-process handler that delegates to connector services.
- Main-process ownership of connector secrets, OAuth state, token refresh, transport clients, tool discovery, and tool execution.

## Rules

- Use invoke-style calls for every connector operation.
- Never return connector secrets or raw OAuth tokens to the renderer.
- Keep OAuth state, credential storage, token refresh, tool discovery, and tool execution in the main process.
- Validate connector ids, inputs, updates, tool names, and tool arguments outside preload.
- Return projected connector and tool views suitable for renderer display.
- Do not expose generic arbitrary network calls through `ConnectorsApi`.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run connector service or IPC tests when configuration, OAuth, or tool behavior changes.
- Run renderer checks when renderer consumers change.
