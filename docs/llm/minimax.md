# MiniMax LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `minimax` |
| Provider doc | [MiniMax provider](../providers/minimax.md) |
| Default base URL | `https://api.minimax.io/v1` |
| Runtime adapter | `OpenAIChatAdapter` |
| Provider API style | OpenAI-compatible Chat Completions |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `MiniMax-M2.7` | Main assistant and agent task turns |
| `MiniMax-M2.5` | Main assistant and agent task turns |

## What Friday Uses

Friday uses MiniMax chat models through the OpenAI-compatible chat adapter. It
sends converted chat messages, selected function tools, automatic tool choice
when tools are present, `max_tokens`, streaming, and usage streaming options.

The adapter maps streamed text, tool calls, usage, and stop reasons into
Friday's provider-neutral loop.

## Not Used Here

This LLM path does not use MiniMax text-to-speech, video, or music/audio models.

