# tool_search

`tool_search` searches the hidden tool catalog by keyword.

## Tool Search Description

Use `tool_search` when tool search compaction is active and the visible tools do not include the capability needed for the task.

## Use For

- Finding deferred tools by name, label, description, or owner metadata.
- Narrowing a large tool catalog before loading schemas.

## Do Not Use For

- Calling a hidden tool directly.
- Searching files or web content.

## Keep In Mind

After finding a match, use `tool_describe` to inspect the schema or `tool_call` to execute the hidden tool through the wrapped execution path.
