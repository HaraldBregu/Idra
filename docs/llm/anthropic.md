# Anthropic LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `anthropic` |
| Provider doc | [Anthropic provider](../providers/anthropic.md) |
| Default base URL | `https://api.anthropic.com` |
| Runtime adapter | `AnthropicAdapter` |
| Provider API style | Anthropic Messages API |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `claude-opus-4-7` | Main assistant and agent task turns |
| `claude-sonnet-4-6` | Main assistant and agent task turns |

## What Friday Uses

Friday sends the selected model id to Anthropic Messages. It passes the rendered
system prompt through `system`, converts transcript entries into Anthropic
messages, and exposes selected tools through Anthropic tool schemas.

The adapter consumes Anthropic streaming events and maps text deltas, tool-use
blocks, partial JSON tool arguments, usage, and stop reasons into Friday's
provider-neutral event contract.

## Not Used Here

Friday does not pass model reasoning effort to the Anthropic adapter today.

