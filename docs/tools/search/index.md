# Tool Search

Tool search helps an agent find a relevant tool from a large catalog without loading every tool definition at the start of a run.

Use tool search when the available tool set is large, dynamic, or split across providers and MCP servers. Do not use it when there are only a few tools and the agent can see them directly.

## How It Works

1. The agent starts with a small visible tool set.
2. Some tools are kept deferred.
3. When the agent needs a missing capability, it searches the deferred catalog.
4. Matching tools become available for the run.
5. The agent calls only tools that were actually loaded.

## Good Tool Search Depends On

- clear tool names
- short descriptions that match user language
- focused tool groups
- stable schemas
- a small set of high-frequency tools loaded immediately

## Provider Notes

- [OpenAI tool search](openai.md)
- [Anthropic tool search](anthropic.md)
