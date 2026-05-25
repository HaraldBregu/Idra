# tool_describe

`tool_describe` returns the schema and metadata for one hidden catalog tool.

## Tool Search Description

Use `tool_describe` after `tool_search` returns a candidate and the agent needs the exact parameters before execution.

## Use For

- Inspecting a hidden tool's parameter schema.
- Checking metadata before deciding whether to call a hidden tool.

## Do Not Use For

- Discovering tools by keyword. Use `tool_search` first.
- Executing the hidden tool.

## Keep In Mind

Describe only tools that were returned by the hidden catalog. If the tool is unknown, report that it is unavailable.
