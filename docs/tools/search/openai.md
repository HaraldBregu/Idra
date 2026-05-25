# OpenAI Tool Search

OpenAI tool search is a way to keep a large tool catalog out of the initial context and let the model load relevant tools only when needed.

## Use It When

- the application knows many possible tools at request time
- tools are grouped by namespace, connector, or MCP server
- loading every tool would waste context or reduce selection quality

## Avoid It When

- the agent only needs a small fixed tool set
- every tool is commonly used
- the runtime cannot safely validate deferred tool schemas

## Design Rules

- Keep visible tool descriptions short and useful.
- Group related tools together.
- Use words users would naturally ask for.
- Keep frequently used tools visible from the start.
- Load only tools that are relevant to the current task.

## Implementation Note

Provider support and request details can change. Check the current OpenAI documentation before implementing or changing the runtime behavior.
