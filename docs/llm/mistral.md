# Mistral AI LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `mistral` |
| Provider doc | [Mistral provider](../providers/mistral.md) |
| Default base URL | `https://api.mistral.ai/v1` |
| Runtime adapter | `MistralAdapter` |
| Provider API style | Native Mistral Chat API |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `mistral-large-2512` | Main assistant and agent task turns |
| `mistral-medium-3-5` | Main assistant and agent task turns |
| `devstral-2512` | Development-focused agent task turns |

## What Friday Uses

Friday sends the selected model id to Mistral Chat streaming. It converts the
system prompt and transcript into Mistral messages, exposes selected tools as
function tools, enables `toolChoice: auto`, enables parallel tool calls when
tools exist, passes `maxTokens`, and maps Friday reasoning effort to Mistral's
reasoning effort field.

The adapter streams text, tool calls, tool argument deltas, usage, and stop
reasons back into Friday's provider-neutral loop.

## Not Used Here

This LLM path does not use Mistral speech-to-text or text-to-speech models.

