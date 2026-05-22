# Alibaba / Qwen / Wan LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `qwen` |
| Provider doc | [Alibaba / Qwen / Wan provider](../providers/qwen.md) |
| Default base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Runtime adapter | `QwenAdapter` |
| Provider API style | OpenAI-compatible Chat Completions |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `qwen3.7-max` | Main assistant and agent task turns |
| `qwen3.6-plus` | Main assistant and agent task turns |
| `qwen3.6-flash` | Main assistant and agent task turns where a faster Qwen model is selected |

## What Friday Uses

Friday sends Qwen chat models through DashScope's OpenAI-compatible endpoint. It
uses converted chat messages, selected function tools, automatic tool choice
when tools are present, `max_tokens`, streaming, and usage streaming options.

The adapter maps streamed text and tool calls into Friday's shared event
contract.

## Not Used Here

This LLM path does not use Qwen speech-to-text, realtime voice, image, or video
models.

