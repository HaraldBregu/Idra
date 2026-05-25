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

## Implementation Note

Provider support, variants, limits, and request fields can change. Check the current Anthropic documentation before implementing or changing the runtime behavior.
