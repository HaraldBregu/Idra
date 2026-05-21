# Providers

This document describes how Friday should handle provider configuration, agent
model catalogs, reasoning effort, and provider-specific runtime behavior.

Provider credentials are stored on the provider record. Per-run overrides can
select `providerId`, `model`, and for OpenAI `effort`, but they do not accept
API keys or base URLs.

## Agent Model Selection

The settings path should return only models that are valid for the selected
provider. If a known provider has no main-agent model catalog, the model list
should be empty for the main Friday agent. Unknown provider ids should return
an unsupported-provider error.

When saving the main agent service:

- The provider id must be configured in the stored provider list.
- The model id must be one of the default models for providers that have a
  default catalog.
- OpenAI models store a validated `effort` value.
- Non-OpenAI models are saved as `{ id, name }`; any effort value is stripped.

The main run path resolves provider and model once per `AgentService.send`
call. The selected provider record supplies the API key and base URL, then
`makeProvider` creates the adapter.

## Reasoning Effort

Friday currently defines these reasoning effort values:

| Effort | Meaning in Friday |
| --- | --- |
| `none` | Ask for no explicit reasoning effort when the provider supports that value. |
| `minimal` | Lowest OpenAI-specific effort value except where a model excludes it. |
| `low` | Low reasoning effort. |
| `medium` | Default saved effort. |
| `high` | High reasoning effort. |
| `xhigh` | Extra-high Friday setting; mapped only where an adapter supports a reduced provider set. |

OpenAI effort handling:

- Default effort is `medium`.
- `gpt-5.4-mini` supports every effort except `minimal`.
- Other configured OpenAI models support `none`, `minimal`, `low`, `medium`,
  `high`, and `xhigh`.
- The OpenAI Responses adapter passes effort as `reasoning: { effort }`.

Non-OpenAI effort handling:

- The saved settings UI and `AgentService` currently pass effort only when the
  resolved provider id is `openai`.
- The Mistral adapter contains a mapping from Friday effort to Mistral effort:
  `none` maps to `none`, and `high` or `xhigh` map to `high`.
- The DeepSeek adapter can pass `reasoning_effort` for `low`, `medium`, and
  `high`, but the current main agent service does not resolve saved effort for
  DeepSeek.
- Anthropic, Qwen, and the generic OpenAI-compatible fallback path do not use
  Friday's saved effort value today.

## Runtime Adapter Behavior

| Provider id | Adapter | Runtime behavior |
| --- | --- | --- |
| `openai` | `OpenAIAdapter` | Uses the OpenAI Responses API through the OpenAI SDK. Sends `instructions`, `input`, function tools, `max_output_tokens`, `reasoning`, and includes encrypted reasoning content. |
| `anthropic` | `AnthropicAdapter` | Uses Anthropic Messages through the Anthropic SDK. Sends `system`, `messages`, `max_tokens`, and Anthropic tool schemas. |
| `mistral` | `MistralAdapter` | Uses Mistral chat streaming through `@mistralai/mistralai`. Normalizes `/v1` base URLs to the SDK server URL format and maps supported effort values. |
| `mistal` | `MistralAdapter` | Accepted as a compatibility typo alias. It is not a default provider id. |
| `deepseek` | `DeepSeekAdapter` | Uses OpenAI Chat Completions compatibility against `https://api.deepseek.com` unless the stored base URL overrides it. |
| `qwen` | `QwenAdapter` | Uses OpenAI Chat Completions compatibility against DashScope compatible mode unless the stored base URL overrides it. |
| all other ids | `OpenAIChatAdapter` | Uses OpenAI Chat Completions-compatible request shapes against the stored base URL. Only use these as main-agent providers when the target endpoint is actually compatible. |

All adapters emit the same provider-neutral event contract: message start,
text deltas, tool-call start and argument deltas, tool-call end, optional
reasoning items, and message end with usage.

## Run Examples

Main agent calls can override provider and model per run:

```ts
await agentService.send('Summarize the release notes.', 'main', {
	providerId: 'anthropic',
	model: 'claude-sonnet-4-6',
});
```

OpenAI runs can also override reasoning effort:

```ts
await agentService.send('Review this TypeScript diff.', 'main', {
	providerId: 'openai',
	model: 'gpt-5.5',
	effort: 'high',
});
```

The `agent.run` task input accepts the same fields:

```json
{
	"message": "Summarize the release notes.",
	"providerId": "mistral",
	"model": "mistral-large-latest"
}
```

Friday cron `agentTurn` jobs can also pass `providerId`, `model`, and
`thinking` in the job payload. `thinking` is converted to the send option
`effort`, but the main service currently applies that value only to OpenAI.

## Provider Catalog

Each provider name links to its provider-specific markdown file.

| Provider | Provider id | Capabilities | Main-agent model catalog |
| --- | --- | --- | --- |
| [OpenAI](openai.md) | `openai` | Chat - Speech-to-text - Text-to-speech - Image - Video | Configured |
| [Anthropic](anthropic.md) | `anthropic` | Chat | Configured |
| [Google DeepMind / Google](google.md) | `google` | Chat - Speech-to-text - Text-to-speech - Image - Video - Music | Configured |
| [Meta](meta.md) | `meta` | Chat - Video | Configured |
| [xAI](xai.md) | `xai` | Chat - Speech-to-text - Realtime voice - Image - Video | Configured |
| [Mistral AI](mistral.md) | `mistral` | Chat - Speech-to-text - Text-to-speech | Configured |
| [Cohere](cohere.md) | `cohere` | Chat - Speech-to-text | Configured |
| [DeepSeek](deepseek.md) | `deepseek` | Chat | Configured |
| [Alibaba / Qwen / Wan](qwen.md) | `qwen` | Chat - Speech-to-text - Omni - Image - Video | Configured |
| [Moonshot AI / Kimi](kimi.md) | `kimi` | Chat | Configured |
| [Z.ai / Zhipu AI](zai.md) | `zai` | Chat | Configured |
| [Baidu](baidu.md) | `baidu` | Chat - Speech-to-text - Omni - Image | Configured |
| [Tencent Hunyuan](tencent-hunyuan.md) | `tencent-hunyuan` | Chat - Image - Video - 3D | Configured |
| [ByteDance Seed](bytedance-seed.md) | `bytedance-seed` | Chat - Image - Video - 3D | Configured |
| [MiniMax](minimax.md) | `minimax` | Chat - Text-to-speech - Video - Music | Configured |
| [ElevenLabs](elevenlabs.md) | `elevenlabs` | Speech-to-text - Text-to-speech - Audio - Music | None |
| [Deepgram](deepgram.md) | `deepgram` | Speech-to-text - Text-to-speech | None |
| [Cartesia](cartesia.md) | `cartesia` | Text-to-speech | None |
| [Black Forest Labs](black-forest-labs.md) | `black-forest-labs` | Image | None |
| [Midjourney](midjourney.md) | `midjourney` | Image - Video | None |
| [Adobe Firefly](adobe-firefly.md) | `adobe-firefly` | Image - Video - Audio | None |
| [Kuaishou / Kling AI](kling.md) | `kling` | Image - Video - Audio | None |
| [Runway](runway.md) | `runway` | Video | None |
| [Luma AI](luma.md) | `luma` | Omni - Image - Video - 3D | Configured |
| [Stability AI](stability-ai.md) | `stability-ai` | Image - Video - Audio | None |
| [Ideogram](ideogram.md) | `ideogram` | Image | None |
| [Pika](pika.md) | `pika` | Video | None |
| [Suno](suno.md) | `suno` | Music | None |
| [Reka AI](reka.md) | `reka` | Chat | Configured |
| [AI21 Labs](ai21.md) | `ai21` | Chat | Configured |
| [Perplexity](perplexity.md) | `perplexity` | Research chat | Configured |
| [NVIDIA](nvidia.md) | `nvidia` | Chat - Speech-to-text | Configured |

## Provider Lists Without Main-Agent Models

These providers are present in `DEFAULT_PROVIDERS` but do not have a default
entry in `DEFAULT_AGENT_MODELS_BY_PROVIDER`:

| Provider id | Purpose in constants |
| --- | --- |
| [`elevenlabs`](elevenlabs.md) | Speech-to-text, text-to-speech, audio, and music credentials. |
| [`deepgram`](deepgram.md) | Speech-to-text and text-to-speech credentials. |
| [`cartesia`](cartesia.md) | Text-to-speech credentials. |
| [`black-forest-labs`](black-forest-labs.md) | Image generation credentials. |
| [`midjourney`](midjourney.md) | Image and video provider placeholder with no configured official API-key link. |
| [`adobe-firefly`](adobe-firefly.md) | Adobe Firefly Services credentials. |
| [`kling`](kling.md) | Kling image/video/audio credentials. |
| [`runway`](runway.md) | Runway video credentials. |
| [`stability-ai`](stability-ai.md) | Stability image/video/audio credentials. |
| [`ideogram`](ideogram.md) | Ideogram image credentials. |
| [`pika`](pika.md) | Pika/Fal video credentials. |
| [`suno`](suno.md) | Music provider placeholder with no configured official API-key link. |

Adding one of these providers to the main agent picker requires adding a
provider entry to `DEFAULT_AGENT_MODELS_BY_PROVIDER` and verifying the runtime
adapter can call that provider's chat endpoint.
