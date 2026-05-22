# heartbeat_respond

`heartbeat_respond` reports status during heartbeat runs.

## How It Is Used

- Used when heartbeat tool reporting is enabled.
- Lets Friday answer the runtime's health check with a tool result.
- Helps the app know that the agent loop is alive and responsive.

## Boundaries

- It is only for heartbeat runs.
- It is not used to perform user-facing work.
