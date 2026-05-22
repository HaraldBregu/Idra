# Models

This document is the user-facing model catalog for Friday. It summarizes the
model families Friday currently exposes, which providers own each model list,
and where runtime support is implemented versus still placeholder-backed or
pending.

The source of truth is:

- Model catalogs and provider-keyed placeholder catalogs in
  `src/shared/provider-models.ts`.
- `DEFAULT_AGENT_MODELS_BY_PROVIDER` and `DEFAULT_PROVIDERS` in
  `src/shared/providers.ts`.
- Module model constants and runtime status in `src/shared/service.ts`.
- Provider adapter routing in `src/main/provider/factory.ts`.
- Module services, task handlers, and tool wrappers under `src/main`.

## Support Levels

Friday uses several kinds of model support:

| Support level                      | Meaning                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit model catalog             | Friday stores concrete model ids for a provider and can validate saved selections against that list.                                            |
| Provider-keyed placeholder catalog | Friday exposes provider/model settings for a capability, but the model id is a placeholder until provider-specific catalogs and adapters exist. |
| Endpoint-backed module             | Friday can run through a configured endpoint instead of a provider/model adapter.                                                               |
| No default catalog                 | Friday has the store shape and target module contract, but no selectable default provider/model entries yet.                                    |

Current module status:

| Module                                          | Store key      | Support level                                                            | Runtime status                                                |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [Large language model](large-language-model.md) | `llmAgent`     | Explicit model catalog                                                   | Implemented                                                   |
| [Speech to text](speech-to-text.md)             | `speechToText` | Concrete provider catalog                                                | Implemented for OpenAI, ElevenLabs, Mistral, and Qwen; Deepgram and xAI adapters pending |
| [Text to speech](text-to-speech.md)             | `textToSpeech` | ElevenLabs explicit model plus provider placeholders                     | Pending runtime                                               |
| [Text to image](text-to-image.md)               | `imageCreator` | Provider-keyed placeholder catalog                                       | Service, task, and tool path exist; provider adapters pending |
| [Text to video](text-to-video.md)               | `textToVideo`  | Provider-keyed placeholder catalog                                       | Pending runtime                                               |
| [Text to audio](music-creator.md)               | `textToSound`  | Provider-keyed placeholder catalog                                       | Pending runtime                                               |
| [OCR](ocr.md)                                   | `ocr`          | Endpoint-backed now; placeholder model constant for future provider mode | `ocr.run` endpoint path implemented; provider runtime pending |
| [Embedding](embedding.md)                       | `embedding`    | No default catalog                                                       | Pending runtime                                               |

## LLM Agent Models

The LLM agent uses `DEFAULT_AGENT_MODELS_BY_PROVIDER`. Settings return only the
static catalog for known catalog-backed providers. Known providers without a
main-agent catalog return an empty model list for the assistant. Unknown
provider ids are rejected.

| Provider id       | Provider                 | Runtime adapter                   | Supported model ids                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`          | OpenAI                   | Native OpenAI Responses adapter   | `gpt-5.5`, `gpt-5.5-pro`, `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.4-mini`                                                                                                                                                                                                                                                                                          |
| `anthropic`       | Anthropic                | Native Anthropic Messages adapter | `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-sonnet-4-5`, `claude-haiku-4-5`                                                                                                                                                                                                                                                          |
| `google`          | Google DeepMind / Google | OpenAI-compatible chat adapter    | `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`                                                                                                                                                                                                                                           |
| `meta`            | Meta                     | OpenAI-compatible chat adapter    | `llama-4-maverick`, `llama-4-scout`, `llama-3.3-70b`                                                                                                                                                                                                                                                                                                        |
| `xai`             | xAI                      | OpenAI-compatible chat adapter    | `grok-4.3`, `grok-4.3-fast`, `grok-code-fast`                                                                                                                                                                                                                                                                                                               |
| `mistral`         | Mistral AI               | Native Mistral adapter            | `mistral-large-2512`, `mistral-large-latest`, `mistral-medium-2604`, `mistral-medium-latest`, `mistral-medium-2508`, `mistral-small-2603`, `mistral-small-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-8b-2512`, `ministral-8b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `magistral-medium-2509`, `magistral-medium-latest` |
| `deepseek`        | DeepSeek                 | Native DeepSeek adapter           | `deepseek-v4-pro`, `deepseek-v4-flash`                                                                                                                                                                                                                                                                                                                      |
| `qwen`            | Alibaba / Qwen / Wan     | Native Qwen adapter               | `qwen3-max`, `qwen3.5-plus`, `qwen3.5-flash`, `qwen3-coder-plus`, `qwq-plus`                                                                                                                                                                                                                                                                                |
| `kimi`            | Moonshot AI / Kimi       | OpenAI-compatible chat adapter    | `kimi-k2.6`, `kimi-k2.5`, `kimi-k2`, `kimi-latest`                                                                                                                                                                                                                                                                                                          |
| `zai`             | Z.ai / Zhipu AI          | OpenAI-compatible chat adapter    | `glm-5.1`, `glm-5`, `glm-4.6`, `glm-4.5v`, `glm-z1`                                                                                                                                                                                                                                                                                                         |
| `minimax`         | MiniMax                  | OpenAI-compatible chat adapter    | `minimax-m2.7`                                                                                                                                                                                                                                                                                                                                              |
| `luma`            | Luma AI                  | OpenAI-compatible chat adapter    | `uni-1`                                                                                                                                                                                                                                                                                                                                                     |
| `reka`            | Reka AI                  | OpenAI-compatible chat adapter    | `reka-core`, `reka-flash`, `reka-edge`                                                                                                                                                                                                                                                                                                                      |
| `perplexity`      | Perplexity               | OpenAI-compatible chat adapter    | `sonar-reasoning-pro`, `sonar-pro`, `sonar-deep-research`, `r1-1776`                                                                                                                                                                                                                                                                                        |

LLM reasoning effort:

| Provider        | Saved effort behavior                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`        | Saved and passed to the Responses API as `reasoning.effort`. `gpt-5.4-mini` excludes `minimal`; other configured OpenAI models allow `none`, `minimal`, `low`, `medium`, `high`, and `xhigh`. |
| Other providers | Saved model data is reduced to `{ id, name }`; effort is not saved or passed by the default main-agent service path.                                                                          |

## Speech-To-Text Models

Speech to text uses `SPEECH_TO_TEXT_MODELS_BY_PROVIDER` and the default adapter
registry in `src/main/stt/service.ts`.

| Provider id | Provider | Model ids | Runtime notes |
| --- | --- | --- | --- |
| `openai` | OpenAI | `gpt-realtime-whisper` | Realtime adapter. The configured model id is the transcription model; the OpenAI socket uses its own realtime connection model internally. |
| `deepgram` | Deepgram | `nova-3`, `flux` | Cataloged for selection and validation; no default runtime adapter is registered yet. |
| `elevenlabs` | ElevenLabs | `scribe_v2`, `scribe_v2_realtime` | Batch and realtime adapter. The batch model buffers audio until `finish`; the realtime model uses ElevenLabs WebSocket transcription. |
| `mistral` | Mistral AI | `voxtral-mini-2602`, `voxtral-mini-transcribe-realtime-2602` | Batch and realtime adapter through the Mistral SDK. |
| `xai` | xAI | `xai-stt-batch`, `xai-stt-streaming` | Cataloged for selection and validation; no default runtime adapter is registered yet. |
| `qwen` | Alibaba / Qwen / Wan | `qwen3.5-omni`, `qwen3-omni-flash` | Realtime adapter. Catalog ids are resolved to exact upstream Qwen realtime models. |

Provider-specific runtime notes are documented in
[speech-to-text provider runbooks](../speech-to-text/index.md).

## Text-To-Speech Models

Text to speech is modeled as a future module. The current code exposes one
concrete ElevenLabs selection and placeholder selections for other
text-to-speech capable providers:

| Provider id  | Provider                 | Catalog model id                      | Runtime notes                                                     |
| ------------ | ------------------------ | ------------------------------------- | ----------------------------------------------------------------- |
| `elevenlabs` | ElevenLabs               | `rachel-multilingual`                 | Concrete catalog entry, but runtime status is `pending-runtime`. |
| `openai`     | OpenAI                   | `text-to-speech-provider-coming-soon` | Placeholder catalog entry.                                        |
| `google`     | Google DeepMind / Google | `text-to-speech-provider-coming-soon` | Placeholder catalog entry.                                        |
| `mistral`    | Mistral AI               | `text-to-speech-provider-coming-soon` | Placeholder catalog entry.                                        |
| `minimax`    | MiniMax                  | `text-to-speech-provider-coming-soon` | Placeholder catalog entry.                                        |
| `deepgram`   | Deepgram                 | `text-to-speech-provider-coming-soon` | Placeholder catalog entry.                                        |
| `cartesia`   | Cartesia                 | `text-to-speech-provider-coming-soon` | Placeholder catalog entry.                                        |

Exact provider/model compatibility should be validated by the TTS adapter when
runtime support is added.

## Text-To-Image Providers

Image creation has a provider-keyed placeholder catalog today.
`TEXT_TO_IMAGE_MODELS_BY_PROVIDER` maps image-capable providers to the shared
`image-provider-coming-soon` model id until provider-specific image catalogs
exist.

`TextToImageService`, the `text_to_image` local tool wrapper, and the
`image.create` background task handler are implemented. The default adapter
registry is empty, so real provider execution still requires an image adapter
for the selected provider/model pair.

Providers with image capability in `DEFAULT_PROVIDERS`:

| Provider id         | Provider                 | Catalog model id             | Model selection status                      |
| ------------------- | ------------------------ | ---------------------------- | ------------------------------------------- |
| `openai`            | OpenAI                   | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `google`            | Google DeepMind / Google | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `xai`               | xAI                      | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `qwen`              | Alibaba / Qwen / Wan     | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `black-forest-labs` | Black Forest Labs        | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `midjourney`        | Midjourney               | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `kling`             | Kuaishou / Kling AI      | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `luma`              | Luma AI                  | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `stability-ai`      | Stability AI             | `image-provider-coming-soon` | Placeholder model id, pending image adapter |
| `ideogram`          | Ideogram                 | `image-provider-coming-soon` | Placeholder model id, pending image adapter |

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

Text-to-video also has a provider-keyed placeholder catalog today.
`TEXT_TO_VIDEO_MODELS_BY_PROVIDER` maps video-capable providers to the shared
`video-provider-coming-soon` model id until provider-specific video catalogs
and adapters exist.

Providers with video capability in `DEFAULT_PROVIDERS`:

| Provider id       | Provider                 | Catalog model id             | Model selection status                      |
| ----------------- | ------------------------ | ---------------------------- | ------------------------------------------- |
| `openai`          | OpenAI                   | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `google`          | Google DeepMind / Google | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `meta`            | Meta                     | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `xai`             | xAI                      | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `qwen`            | Alibaba / Qwen / Wan     | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `minimax`         | MiniMax                  | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `midjourney`      | Midjourney               | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `kling`           | Kuaishou / Kling AI      | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `runway`          | Runway                   | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `luma`            | Luma AI                  | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `stability-ai`    | Stability AI             | `video-provider-coming-soon` | Placeholder model id, pending video adapter |
| `pika`            | Pika                     | `video-provider-coming-soon` | Placeholder model id, pending video adapter |

Expected runtime boundary:

1. The video module reads `textToVideo`.
2. It resolves `providerId` and `modelId` from saved module settings.
3. It loads credentials, base URL, and webhook configuration from
   `StoreService.getProviderById`.
4. It creates a provider-specific video adapter.
5. It starts an async provider job, then polls or receives completion.
6. It returns normalized video result records to UI, tasks, cron, or tools.

The LLM tool wrapper, if exposed, should pass only prompt, duration, aspect
ratio, and safe reference asset data. It must not accept API keys, base URLs,
webhook secrets, or raw provider records.

## Text-To-Audio Providers

Text-to-audio and music generation use the root `textToSound` settings key and
the `MUSIC_CREATOR_MODELS_BY_PROVIDER` catalog. The catalog is provider-keyed
but placeholder-backed with `music-provider-coming-soon`.

Providers with sound or music capability in the default provider catalog:

| Provider id     | Provider                 | Catalog model id             | Model selection status                      |
| --------------- | ------------------------ | ---------------------------- | ------------------------------------------- |
| `google`        | Google DeepMind / Google | `music-provider-coming-soon` | Placeholder model id, pending sound adapter |
| `minimax`       | MiniMax                  | `music-provider-coming-soon` | Placeholder model id, pending sound adapter |
| `elevenlabs`    | ElevenLabs               | `music-provider-coming-soon` | Placeholder model id, pending sound adapter |
| `kling`         | Kuaishou / Kling AI      | `music-provider-coming-soon` | Placeholder model id, pending sound adapter |
| `stability-ai`  | Stability AI             | `music-provider-coming-soon` | Placeholder model id, pending sound adapter |
| `suno`          | Suno                     | `music-provider-coming-soon` | Placeholder model id, pending sound adapter |

## OCR And Embedding

OCR currently supports the endpoint-backed `ocr.run` task path. Provider-backed
OCR settings can use `ocr` with `mode: 'model'`, but the only model constant is
`document-reader-provider-coming-soon` until an OCR provider catalog and
adapters exist.

Embedding has the root `embedding` settings shape for future semantic indexing,
but `EMBEDDING_MODELS_BY_PROVIDER` is empty. Do not show embedding provider
model choices until provider catalogs, vector index behavior, and runtime
adapters are implemented.

## Selection And Validation Rules

- Store only `providerId`, `modelId`, and safe non-secret options in module
  settings.
- Keep API keys and provider base URLs on provider records in `modelProviders`.
- Validate saved LLM selections against `DEFAULT_AGENT_MODELS_BY_PROVIDER` when
  a provider has a static catalog.
- Validate speech-to-text selections against `SPEECH_TO_TEXT_MODELS_BY_PROVIDER`.
- For image, video, and sound, distinguish placeholder catalog selection from
  runtime readiness; validate adapter availability before sending prompts or
  assets to a provider.
- For OCR, endpoint-backed execution must use the configured endpoint; model
  mode must resolve a provider/model adapter before sending document data.
- For embedding, no default provider/model selections should be exposed until
  the catalog is populated.
- Do not duplicate provider records in task, cron, channel, or tool payloads.

## Related Documentation

- [providers.md](../providers/index.md) documents provider credentials, API
  setup links, and runtime adapter behavior.
- [large-language-model.md](large-language-model.md) documents LLM agent
  execution and provider/model resolution.
- [text-to-image.md](text-to-image.md) documents text-to-image module
  boundaries.
- [text-to-video.md](text-to-video.md) documents text-to-video module
  boundaries.
- [store.md](../data/store.md) documents the target model-backed store shape.
