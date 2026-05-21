# LLM Agent Models

This document describes the explicit model catalog used by Friday's main LLM
agent.

The LLM agent uses `DEFAULT_AGENT_MODELS_BY_PROVIDER`. Settings return only the
static catalog for known catalog-backed providers. Known providers without a
main-agent catalog return an empty model list for the assistant. Unknown
provider ids are rejected.

| Provider id | Provider | Runtime adapter | Supported model ids |
| --- | --- | --- | --- |
| `openai` | OpenAI | Native OpenAI Responses adapter | `gpt-5.5`, `gpt-5.5-pro`, `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.4-mini` |
| `anthropic` | Anthropic | Native Anthropic Messages adapter | `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-sonnet-4-5`, `claude-haiku-4-5` |
| `google` | Google DeepMind / Google | OpenAI-compatible chat adapter | `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` |
| `meta` | Meta | OpenAI-compatible chat adapter | `llama-4-maverick`, `llama-4-scout`, `llama-3.3-70b` |
| `xai` | xAI | OpenAI-compatible chat adapter | `grok-4.3`, `grok-4.3-fast`, `grok-code-fast` |
| `mistral` | Mistral AI | Native Mistral adapter | `mistral-large-2512`, `mistral-large-latest`, `mistral-medium-2604`, `mistral-medium-latest`, `mistral-medium-2508`, `mistral-small-2603`, `mistral-small-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-8b-2512`, `ministral-8b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `magistral-medium-2509`, `magistral-medium-latest` |
| `cohere` | Cohere | OpenAI-compatible chat adapter | `command-a-03-2025`, `command-a-reasoning-08-2025`, `command-a-vision-07-2025`, `aya-vision` |
| `deepseek` | DeepSeek | Native DeepSeek adapter | `deepseek-v4-pro`, `deepseek-v4-flash` |
| `qwen` | Alibaba / Qwen / Wan | Native Qwen adapter | `qwen3-max`, `qwen3.5-plus`, `qwen3.5-flash`, `qwen3-coder-plus`, `qwq-plus` |
| `kimi` | Moonshot AI / Kimi | OpenAI-compatible chat adapter | `kimi-k2.6`, `kimi-k2.5`, `kimi-k2`, `kimi-latest` |
| `zai` | Z.ai / Zhipu AI | OpenAI-compatible chat adapter | `glm-5.1`, `glm-5`, `glm-4.6`, `glm-4.5v`, `glm-z1` |
| `baidu` | Baidu | OpenAI-compatible chat adapter | `ernie-5.1`, `ernie-5.0`, `ernie-x1.1`, `ernie-4.5` |
| `tencent-hunyuan` | Tencent Hunyuan | OpenAI-compatible chat adapter | `hy3-preview` |
| `bytedance-seed` | ByteDance Seed | OpenAI-compatible chat adapter | `seed2.0-pro`, `seed2.0-code` |
| `minimax` | MiniMax | OpenAI-compatible chat adapter | `minimax-m2.7` |
| `luma` | Luma AI | OpenAI-compatible chat adapter | `uni-1` |
| `reka` | Reka AI | OpenAI-compatible chat adapter | `reka-core`, `reka-flash`, `reka-edge` |
| `ai21` | AI21 Labs | OpenAI-compatible chat adapter | `jamba-large`, `jamba-mini`, `jamba-1.5-large`, `jamba-1.5-mini` |
| `perplexity` | Perplexity | OpenAI-compatible chat adapter | `sonar-reasoning-pro`, `sonar-pro`, `sonar-deep-research`, `r1-1776` |
| `nvidia` | NVIDIA | OpenAI-compatible chat adapter | `nemotron-ultra-latest`, `llama-nemotron-super`, `llama-nemotron-nano`, `nemotron-vl` |

## Reasoning Effort

| Provider | Saved effort behavior |
| --- | --- |
| `openai` | Saved and passed to the Responses API as `reasoning.effort`. `gpt-5.4-mini` excludes `minimal`; other configured OpenAI models allow `none`, `minimal`, `low`, `medium`, `high`, and `xhigh`. |
| `deepseek` | Saved with `none`, `high`, or `xhigh`; the adapter can map supported values to DeepSeek-compatible `reasoning_effort`. |
| Other providers | Saved model data is reduced to `{ id, name }`; effort is not saved for the main agent path. |

## Related Docs

- [Model catalog](index.md)
- [Agent runtime](../agent.md)
- [Providers](../providers.md)
