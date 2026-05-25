# Anthropic Tool Search

Anthropic tool search lets Claude discover deferred tools when the visible tool list would otherwise be too large.

## Use It When

- the catalog has many tools
- tools belong to multiple services or MCP servers
- the agent needs better tool selection than a crowded visible list allows

## Avoid It When

- there are only a few tools
- all tools are needed on most turns
- the deferred tool descriptions are vague or hard to search

## Design Rules

- Name tools consistently.
- Put user-facing keywords in descriptions.
- Keep a small set of common tools visible.
- Group related capabilities together.
- Monitor misses and improve descriptions when the wrong tools are found.

## Implementation Steps

1. Identify which tools are needed on most turns and mark them as the visible set.
2. Mark the remaining tools as deferred in the API request.
3. When the agent determines a needed capability is not in the visible set, it calls the tool search tool with a natural-language query matching the user's intent.
4. The system returns matching tool definitions. The agent adds them to its active set for the current turn.
5. The agent calls only tools that were explicitly loaded — never call a deferred tool without first loading it through search.

## Tuning

- If the agent frequently fails to find the right tool, improve the description for that tool — add synonyms and user-facing phrasing.
- If tool search returns irrelevant results, tighten descriptions and remove keywords shared across unrelated tools.
- If tool search is rarely used, the visible set may be too large — move infrequent tools to deferred.
- Measure miss rate (needed tool not found) and false-match rate (wrong tool returned) separately. Address each differently.

## Implementation Note

Provider support, variants, request fields, and limits can change. Check the current Anthropic documentation before implementing or changing the runtime behavior.
