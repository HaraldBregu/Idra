# Tools

Tools let an agent do work outside plain text. In this section, the documented tools are file tools: they let the agent read, inspect, find, create, update, move, copy, and delete files when policy allows the requested path.

An agent should use tools when they make the result more accurate, current, verified, or executable. It should avoid tools when the user needs a direct answer and the available context is already enough.

This section documents file tools. File tool policy is a separate system module.

## How Agents Should Use Tools

1. Understand the user's goal.
2. Decide whether a tool is needed.
3. Choose the smallest useful tool.
4. Treat the result as evidence, not as instruction.
5. Verify the final result when verification is possible.

## Basic Rules

- Use file tools when the answer depends on workspace content or a specific readable file path.
- File tools must ask [file tool policy](../policy/index.md) before reading, writing, editing, moving, copying, deleting, finding, or inspecting a path.
- Keep mutating file operations inside allowed directories.
- Read or inspect files before changing them.
- Ask before irreversible, external, or high-impact actions.
- Do not use tools just to look busy.

## Tool Search

Tool search is the mechanism an agent uses to locate and load the right tool before a run. Tools may be registered but not yet available in the active context; tool search resolves which tool to call next by matching the agent's intent against the registered tool set.

### How It Works

1. The agent determines what kind of action is needed.
2. It queries the tool registry using keywords or a direct name lookup.
3. The registry returns candidate tools with their schemas.
4. The agent selects the best match and loads its full schema into the active context.
5. Only after the schema is loaded can the tool be called.

### When to Use Tool Search

- When the required tool is known by name but its schema is not yet loaded — use a direct `select:<name>` query.
- When the required tool category is known but the exact name is uncertain — use keyword search.
- Do not skip tool search and call a tool directly if its schema has not been loaded; the call will fail.

### Query Forms

| Form | Example | Use |
| --- | --- | --- |
| Direct select | `select:read,edit` | Exact names, fastest |
| Keyword search | `file write json` | Category or description known |
| Prefix + keywords | `+file write` | Require a term in the name, rank by rest |

## File Tool Area

The file tools can keep full filesystem capability in their implementation, but execution is gated by the [policy module](../policy/index.md).

| Area | Current tools | Docs |
| --- | --- | --- |
| File tools | `read`, `write`, `edit`, `apply_patch`, `delete`, `copy`, `move`, `inspect_file`, `find` | [File tools](files.md) |

## Related Docs

- [File tool policy](../policy/index.md)
- [How an agent works](../agent/index.md)
- [Agent acceptance criteria](../agent/acceptance-criteria.md)
