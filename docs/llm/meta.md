# Meta LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `meta` |
| Provider doc | [Meta provider](../providers/meta.md) |
| Default base URL | `https://ai.meta.com` |
| Runtime adapter | `OpenAIChatAdapter` |
| Provider API style | OpenAI-compatible Chat Completions |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `muse-spark` | Main assistant and agent task turns |
| `llama-4-maverick` | Main assistant and agent task turns |
| `llama-4-scout` | Main assistant and agent task turns |

## What Friday Uses

Friday uses Meta chat models through the OpenAI-compatible chat adapter. It sends
the selected model id, converted chat messages, selected function tools,
automatic tool choice when tools are present, `max_tokens`, and streaming usage
options.

The adapter maps provider text and tool-call streaming into Friday's shared
agent event stream.

## Not Used Here

This LLM path does not use Meta video models.

