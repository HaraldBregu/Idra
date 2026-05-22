# DeepSeek LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `deepseek` |
| Provider doc | [DeepSeek provider](../providers/deepseek.md) |
| Default base URL | `https://api.deepseek.com` |
| Runtime adapter | `DeepSeekAdapter` |
| Provider API style | OpenAI-compatible Chat Completions with DeepSeek reasoning options |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `deepseek-v4-pro` | Main assistant and agent task turns |
| `deepseek-v4-flash` | Main assistant and agent task turns where a faster DeepSeek model is selected |

## What Friday Uses

Friday uses DeepSeek through a specialized OpenAI-compatible chat adapter. It
sends converted chat messages, selected function tools, automatic tool choice
when tools are present, `max_tokens`, streaming, and usage streaming options.

The DeepSeek adapter enables reasoning effort, reasoning-content streaming, and
thinking-mode support. Friday records DeepSeek reasoning content as shared
reasoning items when the provider streams it.

## Not Used Here

This path only covers DeepSeek chat models.

