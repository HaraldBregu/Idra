# OpenAI LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `openai` |
| Provider doc | [OpenAI provider](../providers/openai.md) |
| Default base URL | `https://api.openai.com/v1` |
| Runtime adapter | `OpenAIAdapter` |
| Provider API style | OpenAI Responses API |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `gpt-5.5` | Main assistant and agent task turns |
| `gpt-5.4-mini` | Main assistant and agent task turns where a smaller OpenAI model is selected |

## What Friday Uses

Friday sends the selected model id to the OpenAI Responses API. It sends the
rendered system prompt as `instructions`, transcript state as Responses `input`,
and selected tools as function tools with JSON schemas.

The adapter streams text deltas, function-call argument deltas, function-call
completion events, reasoning items, token usage, and end-of-message state back
into the provider-neutral agent loop.

OpenAI is the native provider for reasoning effort in Friday. When an effort is
selected, the adapter sends it through the Responses `reasoning` field and asks
the API to include encrypted reasoning content.

## Not Used Here

This LLM path does not use OpenAI speech, image, video, or realtime voice models.
Those capabilities are documented in their own model modules.

