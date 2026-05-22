# Client Tools

Client tools are actions hosted by the client application for a specific run.

## How They Are Used

- Used when the app hosting Friday offers additional approved actions.
- Let the client provide capabilities that are not part of the built-in tool
  registry.
- Appear only when the client supplies them for the current context.

## Boundaries

- They are run-scoped and may not exist in another session.
- Friday should use them only for the purpose the client exposed them for.
