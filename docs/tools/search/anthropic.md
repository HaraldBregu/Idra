# tool_search

`tool_search` helps the model find the right tool for a task when the available
tool catalog is too large to load into context up front.

In Anthropic's tool-search model, Claude can dynamically discover and load tools
on demand. Instead of seeing every tool definition at the start of a request,
Claude starts with the tool-search tool and any non-deferred tools. When it
needs another tool, it searches the deferred catalog and receives a small set of
matching tool references that become callable.

## Why It Exists

Large tool catalogs create two practical problems:

- Tool definitions can consume a large part of the context window before the
  user task begins.
- Tool selection accuracy drops when the model has too many callable tools at
  once.

Tool search keeps the visible tool set smaller. It is most useful when a system
has many tools, multiple MCP servers, or a tool library that grows over time.

## Anthropic Variants

Anthropic provides two server-side tool-search variants:

| Variant | How Claude searches |
| --- | --- |
| `tool_search_tool_regex_20251119` | Claude writes Python-style regular expression patterns. |
| `tool_search_tool_bm25_20251119` | Claude writes natural-language search queries. |

Use the regex variant when exact names, prefixes, or pattern matching are useful.
Use the BM25 variant when natural-language matching is a better fit.

## How It Works

1. The request includes a tool-search tool.
2. Tools that should not load immediately are marked as deferred.
3. Claude initially sees the search tool and any non-deferred tools.
4. When Claude needs another capability, it searches the deferred tool catalog.
5. The API returns a small set of relevant tool references.
6. Those references are expanded into full tool definitions.
7. Claude can call the discovered tools.

The search covers tool names, tool descriptions, argument names, and argument
descriptions.

## Deferred Loading

Deferred loading is the mechanism that keeps tool definitions out of the initial
context.

- Tools without deferred loading are available immediately.
- Deferred tools load only after Claude finds them through tool search.
- The tool-search tool itself should not be deferred.
- Keep the few most commonly used tools non-deferred when they are needed often.

Deferred tools are appended later in the conversation instead of changing the
initial prompt prefix. That helps preserve prompt caching while still letting
Claude reuse discovered tools in later turns.

## Response Flow

When Claude uses server-side tool search, the response flow contains these
stages:

| Stage | Meaning |
| --- | --- |
| `server_tool_use` | Claude calls the tool-search tool. |
| `tool_search_tool_result` | The API returns search results. |
| `tool_references` | The result points to discovered tools. |
| `tool_use` | Claude calls one of the discovered tools. |

The API expands tool references into full definitions automatically when the
matching deferred tool definitions were included in the request.

## Custom Tool Search

A client can also implement its own search behavior, such as embedding-based or
tenant-specific search. In that case, the custom search tool returns tool
references in a normal tool result.

Every referenced tool still needs a matching top-level tool definition marked
for deferred loading. This keeps custom discovery compatible with the normal
tool-search loading path.

## Errors And Common Mistakes

Request-level errors stop the request before it runs. Common causes include
deferring every tool, including the search tool, or returning a reference to a
tool that was not defined in the request.

Tool-search execution errors can also be returned in a successful response.
Common codes include:

- `too_many_requests`
- `invalid_pattern`
- `pattern_too_long`
- `unavailable`

For the regex variant, queries use Python regular-expression syntax rather than
plain natural language, and the pattern length is limited. Regex searches are
case-sensitive unless the pattern asks for case-insensitive matching.

## Limits And Best Practices

- Use tool search when there are many tools, large tool definitions, or accuracy
  issues from a crowded tool list.
- Prefer normal tool calling when there are only a few tools or every tool is
  used frequently.
- Keep tool names and descriptions clear and searchable.
- Use consistent service or resource prefixes in tool names.
- Include common user-facing keywords in descriptions.
- Keep a small set of high-frequency tools loaded immediately.
- Monitor which tools are discovered and refine descriptions when search misses
  expected matches.

Anthropic's documented limits include up to 10,000 tools in the catalog, 3-5
returned search results per search, a 200-character regex pattern limit, and
support on Claude Mythos Preview, Sonnet 4.0+, Opus 4.0+, and Haiku 4.5+.

## Related Anthropic Docs

- [Advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [MCP connector](https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector)
- [Tool use with prompt caching](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/tool-use-with-prompt-caching)
- [Define tools](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/define-tools)
