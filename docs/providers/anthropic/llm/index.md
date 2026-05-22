# Anthropic Large Language Models

This folder documents the Anthropic large language models we plan to use.

| Model | API id | Description |
| --- | --- | --- |
| Claude Opus 4.7 | `claude-opus-4-7` | Most capable generally available model for complex reasoning and agentic coding. |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Best combination of speed and intelligence. |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fastest model with near-frontier intelligence. |

## Model Details

| Model | Input price | Output price | Context window | Max output | Latency |
| --- | --- | --- | --- | --- | --- |
| Claude Opus 4.7 | $5 / MTok | $25 / MTok | 1M tokens | 128k tokens | Moderate |
| Claude Sonnet 4.6 | $3 / MTok | $15 / MTok | 1M tokens | 64k tokens | Fast |
| Claude Haiku 4.5 | $1 / MTok | $5 / MTok | 200k tokens | 64k tokens | Fastest |

## Provider IDs

| Model | API id | API alias | Bedrock id | Vertex id |
| --- | --- | --- | --- | --- |
| Claude Opus 4.7 | `claude-opus-4-7` |  | `anthropic.claude-opus-4-73` | `claude-opus-4-7` |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |  | `anthropic.claude-sonnet-4-6` | `claude-sonnet-4-6` |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | `claude-haiku-4-5` | `anthropic.claude-haiku-4-5-20251001-v1:0` | `claude-haiku-4-5@20251001` |

## Thinking And Cutoffs

| Model | Extended thinking | Adaptive thinking | Knowledge cutoff | Training data cutoff |
| --- | --- | --- | --- | --- |
| Claude Opus 4.7 | No | Yes | Jan 2026 | Jan 2026 |
| Claude Sonnet 4.6 | Yes | Yes | Aug 2025 | Jan 2026 |
| Claude Haiku 4.5 | Yes | No | Feb 2025 | Jul 2025 |
