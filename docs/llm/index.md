# Large Language Model Providers

This folder documents the provider-specific LLM runtime used by Friday.

The canonical module contract remains
[Large Language Model](../models/large-language-model.md). These files add the
provider-level details: which catalog models are selectable and what Friday
passes to each provider adapter during an agent run.

## Shared Runtime Contract

All LLM and research-chat providers are used through the provider-neutral
`ProviderAdapter` interface.

Friday provides:

- the selected model id from `llmAgent`, per-run overrides, tasks, or heartbeat
  configuration
- the rendered system prompt
- transcript entries converted into provider messages
- selected tool definitions as function/tool schemas
- `maxTokens`
- optional reasoning effort when the adapter supports it
- cancellation through `AbortSignal`

Adapters return:

- message start and end events
- streamed text deltas
- streamed tool-call starts, JSON argument deltas, and tool-call ends
- provider usage when available
- provider auth and context-overflow errors mapped to shared errors

Provider records supply API keys and base URLs. Task input and per-run overrides
must not supply credentials or base URLs.

## Provider Matrix

| Provider | Provider id | Model ids used by Friday | Runtime adapter |
| --- | --- | --- | --- |
| [OpenAI](openai.md) | `openai` | `gpt-5.5`, `gpt-5.4-mini` | Native OpenAI Responses API |
| [Anthropic](anthropic.md) | `anthropic` | `claude-opus-4-7`, `claude-sonnet-4-6` | Anthropic Messages API |
| [Google DeepMind / Google](google.md) | `google` | `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite` | OpenAI-compatible Chat Completions |
| [Meta](meta.md) | `meta` | `muse-spark`, `llama-4-maverick`, `llama-4-scout` | OpenAI-compatible Chat Completions |
| [xAI](xai.md) | `xai` | `grok-4.3`, `grok-build-0.1` | OpenAI-compatible Chat Completions |
| [Mistral AI](mistral.md) | `mistral` | `mistral-large-2512`, `mistral-medium-3-5`, `devstral-2512` | Native Mistral Chat API |
| [DeepSeek](deepseek.md) | `deepseek` | `deepseek-v4-pro`, `deepseek-v4-flash` | OpenAI-compatible Chat Completions with DeepSeek reasoning flags |
| [Alibaba / Qwen / Wan](qwen.md) | `qwen` | `qwen3.7-max`, `qwen3.6-plus`, `qwen3.6-flash` | OpenAI-compatible Chat Completions |
| [Moonshot AI / Kimi](kimi.md) | `kimi` | `kimi-k2.6`, `kimi-k2.5`, `kimi-k2-thinking` | OpenAI-compatible Chat Completions |
| [Z.ai / Zhipu AI](zai.md) | `zai` | `glm-5.1`, `glm-5`, `glm-5-turbo` | OpenAI-compatible Chat Completions |
| [MiniMax](minimax.md) | `minimax` | `MiniMax-M2.7`, `MiniMax-M2.5` | OpenAI-compatible Chat Completions |
| [Reka AI](reka.md) | `reka` | `reka-flash`, `reka-edge-2603` | OpenAI-compatible Chat Completions |
| [Perplexity](perplexity.md) | `perplexity` | `sonar-deep-research`, `sonar-reasoning-pro`, `sonar-pro`, `sonar` | OpenAI-compatible Chat Completions for research-chat models |

## Source Files

- LLM and research-chat catalogs: `src/shared/provider-models.ts`
- Provider records and default base URLs: `src/shared/providers.ts`
- Provider adapter factory: `src/main/provider/factory.ts`
- Provider-neutral runtime contract: `src/main/provider/types.ts`
- Agent module contract: `docs/models/large-language-model.md`
