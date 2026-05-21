# Models

This document is the user-facing model catalog for Friday. It summarizes the
model families Friday currently exposes, which providers own each model list,
and where runtime support is implemented versus still capability-backed.

The source of truth is:

- `DEFAULT_AGENT_MODELS_BY_PROVIDER` and `DEFAULT_PROVIDERS` in
  `src/shared/providers.ts`.
- Module model constants and operator status in `src/shared/service.ts`.
- Provider adapter routing in `src/main/provider/factory.ts`.

## Support Levels

Friday uses two different kinds of model support:

| Support level | Meaning |
| --- | --- |
| Explicit model catalog | Friday stores concrete model ids for a provider and can validate saved selections against that list. |
| Provider capability catalog | Friday knows a provider has a capability, but the exact model ids are provider-specific and the runtime adapter may still be pending. |

Current module status:

| Module | Store key | Support level | Runtime status |
| --- | --- | --- | --- |
| LLM agent | `agent` / target `llmAgent` | Explicit model catalog | Implemented |
| Speech to text | `speechToText` | Explicit model catalog for OpenAI | Implemented |
| Text to speech | `textToSpeech` | Placeholder model constant | Pending runtime |
| Text to image | `imageCreator` | Provider capability catalog | Pending runtime |
| Text to video | `videoCreator` / target `textToVideo` | Provider capability catalog | Pending runtime |

## LLM Agent Models

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

LLM reasoning effort:

| Provider | Saved effort behavior |
| --- | --- |
| `openai` | Saved and passed to the Responses API as `reasoning.effort`. `gpt-5.4-mini` excludes `minimal`; other configured OpenAI models allow `none`, `minimal`, `low`, `medium`, `high`, and `xhigh`. |
| `deepseek` | Saved with `none`, `high`, or `xhigh`; the adapter can map supported values to DeepSeek-compatible `reasoning_effort`. |
| Other providers | Saved model data is reduced to `{ id, name }`; effort is not saved for the main agent path. |

## Speech-To-Text Models

Speech to text currently has one explicit provider/model entry:

| Provider id | Provider | Model id | Display name | Runtime notes |
| --- | --- | --- | --- | --- |
| `openai` | OpenAI | `gpt-realtime-whisper` | GPT Realtime Whisper | Uses the OpenAI realtime adapter for live dictation and transcription. The configured model id represents the transcription model; the realtime socket may use a separate OpenAI realtime connection model internally. |

Other default providers advertise speech-to-text capability in the provider
catalog, but they do not have explicit speech-to-text model ids in
`SPEECH_TO_TEXT_MODELS_BY_PROVIDER` yet.

## Text-To-Speech Models

Text to speech is modeled as a future module. The current code exposes one
placeholder selection:

| Provider id | Provider | Model id | Display name | Runtime notes |
| --- | --- | --- | --- | --- |
| `elevenlabs` | ElevenLabs | `rachel-multilingual` | Rachel - multilingual | Stored as the default TTS selection constant, but the operator status is `pending-runtime`. |

Provider examples already listed for future TTS support include `elevenlabs`,
`deepgram`, `cartesia`, and `openai`. Exact provider/model compatibility should
be validated by the TTS adapter when runtime support is added.

## Text-To-Image Providers

Image creation uses the provider capability catalog today. Friday does not yet
store an explicit image model catalog per provider; `IMAGE_CREATOR_MODELS`
contains `image-provider-coming-soon` as a placeholder.

Providers with image capability in `DEFAULT_PROVIDERS`:

| Provider id | Provider | Catalog capability | Model selection status |
| --- | --- | --- | --- |
| `openai` | OpenAI | Image | Provider model id, pending image runtime adapter |
| `google` | Google DeepMind / Google | Image | Provider model id, pending image runtime adapter |
| `xai` | xAI | Image | Provider model id, pending image runtime adapter |
| `qwen` | Alibaba / Qwen / Wan | Image | Provider model id, pending image runtime adapter |
| `baidu` | Baidu | Image | Provider model id, pending image runtime adapter |
| `tencent-hunyuan` | Tencent Hunyuan | Image | Provider model id, pending image runtime adapter |
| `bytedance-seed` | ByteDance Seed | Image | Provider model id, pending image runtime adapter |
| `black-forest-labs` | Black Forest Labs | Image | Provider model id, pending image runtime adapter |
| `midjourney` | Midjourney | Image | Provider model id, pending image runtime adapter |
| `adobe-firefly` | Adobe Firefly | Image | Provider model id, pending image runtime adapter |
| `kling` | Kuaishou / Kling AI | Image | Provider model id, pending image runtime adapter |
| `luma` | Luma AI | Image | Provider model id, pending image runtime adapter |
| `stability-ai` | Stability AI | Image | Provider model id, pending image runtime adapter |
| `ideogram` | Ideogram | Image | Provider model id, pending image runtime adapter |

Expected runtime boundary:

1. The image module reads `imageCreator`.
2. It resolves `providerId` and `modelId` from saved module settings.
3. It loads credentials and base URL from `StoreService.getProviderById`.
4. It creates a provider-specific image adapter.
5. It returns normalized image result records to UI, tasks, cron, or tools.

The LLM tool wrapper, if exposed, should pass only image instructions and safe
asset references. It must not accept API keys, base URLs, or raw provider
records.

## Text-To-Video Providers

Video creation also uses the provider capability catalog today. Friday does not
yet store an explicit video model catalog per provider; `VIDEO_CREATOR_MODELS`
contains `video-provider-coming-soon` as a placeholder.

Providers with video capability in `DEFAULT_PROVIDERS`:

| Provider id | Provider | Catalog capability | Model selection status |
| --- | --- | --- | --- |
| `openai` | OpenAI | Video | Provider model id, pending video runtime adapter |
| `google` | Google DeepMind / Google | Video | Provider model id, pending video runtime adapter |
| `meta` | Meta | Video | Provider model id, pending video runtime adapter |
| `xai` | xAI | Video | Provider model id, pending video runtime adapter |
| `qwen` | Alibaba / Qwen / Wan | Video | Provider model id, pending video runtime adapter |
| `tencent-hunyuan` | Tencent Hunyuan | Video | Provider model id, pending video runtime adapter |
| `bytedance-seed` | ByteDance Seed | Video | Provider model id, pending video runtime adapter |
| `minimax` | MiniMax | Video | Provider model id, pending video runtime adapter |
| `midjourney` | Midjourney | Video | Provider model id, pending video runtime adapter |
| `adobe-firefly` | Adobe Firefly | Video | Provider model id, pending video runtime adapter |
| `kling` | Kuaishou / Kling AI | Video | Provider model id, pending video runtime adapter |
| `runway` | Runway | Video | Provider model id, pending video runtime adapter |
| `luma` | Luma AI | Video | Provider model id, pending video runtime adapter |
| `stability-ai` | Stability AI | Video | Provider model id, pending video runtime adapter |
| `pika` | Pika | Video | Provider model id, pending video runtime adapter |

Expected runtime boundary:

1. The video module reads `textToVideo` or the current video operator setting.
2. It resolves `providerId` and `modelId` from saved module settings.
3. It loads credentials, base URL, and webhook configuration from
   `StoreService.getProviderById`.
4. It creates a provider-specific video adapter.
5. It starts an async provider job, then polls or receives completion.
6. It returns normalized video result records to UI, tasks, cron, or tools.

The LLM tool wrapper, if exposed, should pass only prompt, duration, aspect
ratio, and safe reference asset data. It must not accept API keys, base URLs,
webhook secrets, or raw provider records.

## Selection And Validation Rules

- Store only `providerId`, `modelId`, and safe non-secret options in module
  settings.
- Keep API keys and provider base URLs on provider records in `modelProviders`.
- Validate saved LLM selections against `DEFAULT_AGENT_MODELS_BY_PROVIDER` when
  a provider has a static catalog.
- Validate speech-to-text selections against `SPEECH_TO_TEXT_MODELS_BY_PROVIDER`.
- For image and video, validate provider capability and adapter availability
  before sending prompts or assets to a provider.
- Do not duplicate provider records in task, cron, channel, or tool payloads.

## Related Documentation

- [providers.md](providers.md) documents provider credentials, API setup links,
  and runtime adapter behavior.
- [agent.md](agent.md) documents LLM agent execution and provider/model
  resolution.
- [text-to-image.md](text-to-image.md) documents text-to-image module
  boundaries.
- [video-creator.md](video-creator.md) documents video module boundaries.
- [store.md](store.md) documents the target model-backed store shape.
