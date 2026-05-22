# tool_describe

`tool_describe` shows details for a hidden tool.

## How It Is Used

- Used after a hidden tool has been found and Friday needs to understand what it
  is for.
- Helps confirm whether the tool matches the user's request.
- Provides enough information to decide whether the tool should be called.

## Boundaries

- It describes a tool; it does not perform the external action.
- Friday should not use a hidden tool just because it exists.
