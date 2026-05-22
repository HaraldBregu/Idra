# Z.ai / Zhipu AI LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `zai` |
| Provider doc | [Z.ai / Zhipu AI provider](../providers/zai.md) |
| Default base URL | `https://api.z.ai/api/paas/v4` |
| Runtime adapter | `OpenAIChatAdapter` |
| Provider API style | OpenAI-compatible Chat Completions |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `glm-5.1` | Main assistant and agent task turns |
| `glm-5` | Main assistant and agent task turns |
| `glm-5-turbo` | Main assistant and agent task turns where a faster GLM model is selected |

## What Friday Uses

Friday uses Z.ai / Zhipu AI through the OpenAI-compatible chat adapter. It sends
converted chat messages, selected function tools, automatic tool choice when
tools are present, `max_tokens`, streaming, and usage streaming options.

The adapter maps text deltas, tool calls, usage, and stop reasons into Friday's
shared provider event contract.

## Not Used Here

This path only covers Z.ai / Zhipu AI chat models.

