# xAI LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `xai` |
| Provider doc | [xAI provider](../providers/xai.md) |
| Default base URL | `https://api.x.ai/v1` |
| Runtime adapter | `OpenAIChatAdapter` |
| Provider API style | OpenAI-compatible Chat Completions |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `grok-4.3` | Main assistant and agent task turns |
| `grok-build-0.1` | Main assistant and build-focused agent turns |

## What Friday Uses

Friday uses xAI chat models through the OpenAI-compatible chat adapter. It sends
converted chat messages, selected function tools, automatic tool choice when
tools are present, `max_tokens`, streaming, and usage streaming options.

The adapter maps text deltas, tool-call deltas, usage, and stop reasons into the
shared provider event contract.

## Not Used Here

This LLM path does not use xAI speech-to-text, realtime voice, image, or video
models.

