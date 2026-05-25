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

## Implementation Steps

1. Decide which tools are common enough to include in every request. These form the initial visible set.
2. Register the remaining tools in the deferred catalog with clear names and descriptions that match user-facing language.
3. At request time, include only the visible set in the tools array.
4. When the model determines it needs a tool not in the visible set, it queries the catalog using the tool search mechanism.
5. The matching tools are returned as definitions. Include them in the next turn's tools array so the model can call them.
6. Call only tools that were explicitly added — do not call deferred tools directly.

## Tuning

- If the model often asks for a tool that is not being found, add more natural-language keywords to that tool's description.
- If the wrong tool is returned, reduce overlap between description text of unrelated tools.
- If search is not being used at all, reconsider whether the visible set is too large or the deferred tools are rarely needed.

## Implementation Note

Provider support and request details can change. Check the current OpenAI documentation before implementing or changing the runtime behavior.
