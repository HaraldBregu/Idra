# Reka AI LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `reka` |
| Provider doc | [Reka AI provider](../providers/reka.md) |
| Default base URL | `https://api.reka.ai/v1` |
| Runtime adapter | `OpenAIChatAdapter` |
| Provider API style | OpenAI-compatible Chat Completions |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `reka-flash` | Main assistant and agent task turns |
| `reka-edge-2603` | Main assistant and agent task turns |

## What Friday Uses

Friday uses Reka through the OpenAI-compatible chat adapter. It sends converted
chat messages, selected function tools, automatic tool choice when tools are
present, `max_tokens`, streaming, and usage streaming options.

The adapter maps streamed text, tool calls, usage, and stop reasons into
Friday's shared provider event contract.

## Not Used Here

This path only covers Reka chat models.

