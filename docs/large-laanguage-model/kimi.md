# Moonshot AI / Kimi LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `kimi` |
| Provider doc | [Moonshot AI / Kimi provider](../providers/kimi.md) |
| Default base URL | `https://api.moonshot.ai/v1` |
| Runtime adapter | `OpenAIChatAdapter` |
| Provider API style | OpenAI-compatible Chat Completions |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `kimi-k2.6` | Main assistant and agent task turns |
| `kimi-k2.5` | Main assistant and agent task turns |
| `kimi-k2-thinking` | Agent turns where a Kimi thinking model is selected |

## What Friday Uses

Friday uses Kimi through the OpenAI-compatible chat adapter. It sends converted
chat messages, selected function tools, automatic tool choice when tools are
present, `max_tokens`, streaming, and usage streaming options.

The adapter maps streamed text, tool-call argument deltas, usage, and stop
reasons into Friday's shared provider event stream.

## Not Used Here

This path only covers Kimi chat models.

