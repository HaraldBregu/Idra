# OpenAI Tool Search

OpenAI `tool_search` lets the model dynamically search for and load tools into
context only when they are needed. This avoids loading all tool definitions at
the start of the request and can reduce token usage and cost.

Tool search is designed to preserve the model's cache. When new tools are
discovered, they are injected at the end of the context window instead of
rewriting the earlier prompt prefix.

Only `gpt-5.4` and later models support `tool_search`.

## How To Enable It

OpenAI tool search requires two setup choices:

1. Add `tool_search` to the request's tool list.
2. Mark the functions or MCP server tools that should be loaded later with
   deferred loading.

If using functions, defer the functions that do not need to be visible at the
start of the request. If using MCP servers, defer loading on the MCP server tool
definition.

## Namespaces And MCP Servers

Tool search can work with deferred functions, namespaces, and MCP servers.
Namespaces and MCP servers are usually better for larger catalogs because the
model initially sees only the high-level name and description.

For namespaces, deferred loading applies to the functions inside the namespace,
not to the namespace object itself. A namespace can mix immediate tools and
deferred tools.

Use clear namespace or MCP server descriptions. They should tell the model what
kind of work is available without listing every function. For better search and
token efficiency, keep each namespace focused and avoid packing too many
unrelated functions into one namespace.

## Hosted Tool Search

Hosted tool search is the simplest OpenAI path when the candidate tools are
already known when the request is created.

Friday or the application declares the deferred functions, namespaces, or MCP
servers up front and adds `tool_search`. If the model needs a deferred tool, the
response includes a search call and a search output before the eventual function
call. The loaded subset then becomes callable.

Use hosted search when the full candidate inventory is known at request time.

## Client-Executed Tool Search

Client-executed tool search gives the application control over discovery. The
model emits a tool-search call, the application performs the lookup, and the
application returns the matching tool-search output.

Use client-executed search when available tools depend on project state, tenant
state, account state, or another system that the application controls.

In client mode, the application should return the search output with the same
call identifier that the model emitted in the search call.

## What Gets Loaded

The search output defines which tools become available to the model. Tools that
are not included in the loaded set are not callable from that point in the
conversation.

Once a tool is loaded, the application does not need to load the same tool again
on later turns unless it intentionally changes the loaded tool set. Changing the
loaded set can break cache continuity, so do it deliberately.

## Advanced Patterns

Most integrations declare all searchable tools in the request's tools
parameter. Client-executed tool search can also return tools that were not
present in the original request, but that should be treated as an advanced
workflow. Returned schemas must be trusted and validated carefully.

## Best Practices

- Use hosted search when the candidate tools are known at request time.
- Use client-executed search when discovery depends on application-controlled
  state.
- Prefer namespaces or MCP servers for large tool groups.
- Keep namespace and server descriptions short, clear, and high level.
- Put detailed usage information in deferred function descriptions.
- Group related deferred functions together.
- Keep each namespace focused so the model can search it effectively.
- Avoid changing the loaded tool set unless the runtime needs to.

## Related OpenAI Docs

- [Function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [Using tools](https://developers.openai.com/api/docs/guides/tools)
- [MCP tools and connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)
