# Tool Search

Tool search lets an agent discover tools from a large catalog without loading every definition at the start of a run. A small visible set covers common actions; the rest are deferred and loaded on demand.

## Tools

| Tool | Use it for |
| --- | --- |
| [tool_search](tool-search.md) | Search hidden catalog tools by keyword. |
| [tool_describe](tool-describe.md) | Return the schema and metadata for one hidden catalog tool. |
| [tool_call](tool-call.md) | Execute a hidden catalog tool after it has been found. |

## When to Use It

- The catalog has many tools and loading all of them would fill context or hurt selection quality.
- Tools are grouped across services, namespaces, or MCP servers.
- The agent needs only a subset of tools on any given turn.

## When to Avoid It

- There are only a few tools and the agent can see them all.
- Every tool is used on most turns — deferring adds latency with no benefit.
- Tool descriptions are vague or inconsistent, making search unreliable.

## How It Works

1. The agent starts with a small visible set covering the most common capabilities.
2. The rest of the catalog is registered as deferred — available but not loaded.
3. When the agent needs a capability not in the visible set, it queries the catalog with a natural-language description of what it needs.
4. The catalog returns matching tool definitions.
5. The agent adds those tools to its active set and calls only tools that were explicitly loaded.

The agent must never call a deferred tool directly. It must search first, receive the definition, then call it.

## Designing Tools for Search

Tool search quality depends almost entirely on how tools are named and described.

- **Names**: use consistent, predictable naming across related tools — `email_send`, `email_read`, not `sendEmail`, `fetch_mail`.
- **Descriptions**: write for the user's language, not the implementation. Include synonyms and the user-facing action the tool performs.
- **Grouping**: keep related tools together in the same namespace or group so they surface together in results.
- **Visible set**: keep it small. Include only the tools that are genuinely needed on most turns.

## Implementation Steps

1. Identify which tools are needed on nearly every turn. Mark these as the visible set.
2. Register the remaining tools as deferred with clear names and descriptions.
3. At request time, include only the visible set.
4. When the agent needs a missing capability, it queries the deferred catalog.
5. Add the returned tool definitions to the active set for the current turn.
6. The agent calls only tools that were added in step 5.

## Tuning

| Symptom | Fix |
| --- | --- |
| Right tool not found | Add synonyms and user-facing phrasing to its description |
| Wrong tool returned | Remove keywords shared with unrelated tools |
| Search rarely used | Visible set may be too large — move infrequent tools to deferred |
| Search called too often | Move the most common deferred tools into the visible set |

## Related Docs

- [Tools](../index.md)
