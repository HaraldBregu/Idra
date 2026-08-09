# Provider Reference

Friday ships 32 provider manifests under `resources/providers`. This page is the canonical
human-readable inventory of those built-in providers, the services they expose in the catalog,
and whether the current runtime can execute each service.

The inventory covers model, search, database, and storage providers. Telegram and Discord are
messaging channels and are documented in [Friday Feature Reference](FEATURES.md#messaging-channels).
MCP servers and extensions are integrations rather than providers.

## Support status

| Status       | Meaning                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Available    | The service has both a catalog entry and an execution path in Friday.                          |
| Partial      | Execution code exists, but a normal configuration or selection path is incomplete.             |
| Mixed        | At least one cataloged capability works, while another capability is catalog only.             |
| Catalog only | Friday can display or select the service, but the runtime has no execution adapter for it.     |
| Code only    | Adapter support exists, but Friday does not ship a provider manifest that makes it selectable. |

A manifest is not proof that a service is executable. The provider-specific factories under
`src/main/models/adapters` determine runtime support.

## Configure a provider

1. Open **Settings → Providers → API Keys** and save the key for each model provider you plan to
   use.
2. Choose the provider and model on the relevant Assistant, RAG, Voice, Transcription, Image,
   Video, or Audio settings page.
3. Configure Brave or Tavily under **Settings → Providers → Search**, Pinecone under the RAG
   settings, and object storage under **Settings → Providers → Storage**.
4. Run the test offered by the settings page, when present, before relying on the provider in an
   agent run.

Provider credentials and selections are stored in Friday's local application-data directory.
Requests, attachments, and credentials are sent to the selected provider when Friday invokes its
API. Provider billing, quotas, regional availability, safety rules, and data-retention policies
still apply.

Most integrations use one API key. The exceptions are:

- **Kling** expects the value saved in the API-key field to use `accessKey:secretKey` format.
- **Cloudflare R2** uses an endpoint, region, access-key ID, secret access key, bucket, and optional
  path-style setting instead of the normal model-provider key form.
- **Pinecone** also requires the RAG index configuration.
- **Brave** and **Tavily** can use `BRAVE_API_KEY` and `TAVILY_API_KEY` respectively when no key is
  stored in Settings.
- **Pika** video execution uses a fal.run adapter even though the built-in manifest links to Pika's
  account page. The credential and endpoint must be compatible with fal.run.

## Built-in provider inventory

Provider links below point to the credential or account page declared by the corresponding
manifest.

| Provider                                                                           | ID                  | Cataloged capabilities                                    | Runtime coverage                                                                                    |
| ---------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [Anthropic](https://console.anthropic.com/settings/keys)                           | `anthropic`         | Chat                                                      | Available                                                                                           |
| [Black Forest Labs](https://dashboard.bfl.ai)                                      | `black-forest-labs` | Image                                                     | Available                                                                                           |
| [Brave](https://api-dashboard.search.brave.com/app/keys)                           | `brave`             | Web search                                                | Available                                                                                           |
| [Cartesia](https://play.cartesia.ai/keys)                                          | `cartesia`          | Text to speech                                            | Available                                                                                           |
| [Cloudflare](https://dash.cloudflare.com)                                          | `cloudflare`        | Object storage                                            | Available                                                                                           |
| [Cohere](https://dashboard.cohere.com/api-keys)                                    | `cohere`            | Embeddings                                                | Available                                                                                           |
| [Deepgram](https://console.deepgram.com)                                           | `deepgram`          | Speech to text, text to speech                            | Available                                                                                           |
| [DeepSeek](https://platform.deepseek.com/api_keys)                                 | `deepseek`          | Chat                                                      | Available                                                                                           |
| [ElevenLabs](https://elevenlabs.io/app/settings/api-keys)                          | `elevenlabs`        | Speech to text, text to speech, audio                     | Available                                                                                           |
| [Google](https://aistudio.google.com/apikey)                                       | `google`            | Chat, text to speech, realtime voice, image, video, audio | Mixed: realtime voice and audio are catalog only                                                    |
| [Ideogram](https://ideogram.ai/manage-api)                                         | `ideogram`          | Image                                                     | Available                                                                                           |
| [Jina AI](https://jina.ai/api-dashboard)                                           | `jina`              | Embeddings                                                | Available                                                                                           |
| [Kimi](https://platform.moonshot.ai/console/api-keys)                              | `kimi`              | Chat                                                      | Available                                                                                           |
| [Kling AI](https://app.klingai.com/global/dev)                                     | `kling`             | Video, audio                                              | Mixed: audio is catalog only                                                                        |
| [Luma AI](https://lumalabs.ai/dream-machine/api/keys)                              | `luma`              | Realtime voice, image, video                              | Mixed: realtime voice is catalog only                                                               |
| [Midjourney](https://www.midjourney.com/account)                                   | `midjourney`        | Image, video                                              | Catalog only; no public execution API is integrated                                                 |
| [MiniMax](https://platform.minimax.io/user-center/basic-information/interface-key) | `minimax`           | Chat, text to speech, video, audio                        | Mixed: audio is catalog only                                                                        |
| [Mistral AI](https://console.mistral.ai/api-keys)                                  | `mistral`           | Chat, speech to text, text to speech                      | Available                                                                                           |
| [Nomic](https://atlas.nomic.ai)                                                    | `nomic`             | Embeddings                                                | Available                                                                                           |
| [OpenAI](https://platform.openai.com/api-keys)                                     | `openai`            | Chat, speech to text, text to speech, embeddings          | Available                                                                                           |
| [Perplexity](https://www.perplexity.ai/settings/api)                               | `perplexity`        | Research chat                                             | Partial: onboarding can select it, but the main Assistant, Tasks, and Health settings filter it out |
| [Pika](https://pika.art)                                                           | `pika`              | Video                                                     | Partial: the adapter uses fal.run while the manifest supplies Pika's URL                            |
| [Pinecone](https://app.pinecone.io)                                                | `pinecone`          | Vector database                                           | Available for RAG                                                                                   |
| [Qwen and Wan](https://modelstudio.console.alibabacloud.com)                       | `qwen`              | Chat, speech to text, realtime voice, image, video        | Mixed: realtime voice is catalog only                                                               |
| [Reka AI](https://platform.reka.ai/apikeys)                                        | `reka`              | Chat                                                      | Available                                                                                           |
| [Runway](https://dev.runwayml.com)                                                 | `runway`            | Video                                                     | Available                                                                                           |
| [Stability AI](https://platform.stability.ai/account/keys)                         | `stability-ai`      | Image, audio                                              | Available                                                                                           |
| [Suno](https://suno.com/account)                                                   | `suno`              | Audio                                                     | Catalog only                                                                                        |
| [Tavily](https://app.tavily.com/home)                                              | `tavily`            | Web search                                                | Available                                                                                           |
| [Voyage AI](https://dashboard.voyageai.com)                                        | `voyage`            | Embeddings                                                | Available                                                                                           |
| [xAI](https://console.x.ai)                                                        | `xai`               | Chat, speech to text, realtime voice, image, video        | Mixed: realtime voice is catalog only                                                               |
| [Z.ai](https://z.ai/manage-apikey/apikey-list)                                     | `zai`               | Chat                                                      | Available                                                                                           |

## Model and service catalog

Names and IDs in this section match the built-in manifests exactly. IDs are the values persisted in
Friday's settings and sent to provider adapters.

### Chat and research

Anthropic uses its native Messages API, OpenAI uses the Responses API, and every other chat
provider uses an OpenAI-compatible Chat Completions path.

Perplexity's research models share that compatible runtime path and appear during first-run setup,
but the main Assistant, Tasks, and Health settings currently list only `large-language-model`
entries. They therefore omit Perplexity's `research-chat-model` entries.

| Provider   | Cataloged models                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic  | Claude Fable 5 (`claude-fable-5`); Claude Opus 5 (`claude-opus-5`); Claude Sonnet 5 (`claude-sonnet-5`); Claude Opus 4.7 (`claude-opus-4-7`); Claude Sonnet 4.6 (`claude-sonnet-4-6`); Claude Haiku 4.5 20251001 (`claude-haiku-4-5-20251001`)                |
| DeepSeek   | DeepSeek V4 Pro (`deepseek-v4-pro`); DeepSeek V4 Flash (`deepseek-v4-flash`)                                                                                                                                                                                  |
| Google     | Gemini 3.1 Pro Preview (`gemini-3.1-pro-preview`); Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite`)                                                                                                                                                            |
| Kimi       | Kimi K3 (`kimi-k3`); Kimi K2.7 Code (`kimi-k2.7-code`); Kimi K2.7 Code Highspeed (`kimi-k2.7-code-highspeed`); Kimi K2.6 (`kimi-k2.6`); Kimi K2.5 (`kimi-k2.5`)                                                                                               |
| MiniMax    | MiniMax M2.7 (`MiniMax-M2.7`); MiniMax M2.5 (`MiniMax-M2.5`)                                                                                                                                                                                                  |
| Mistral AI | Mistral Large 2512 (`mistral-large-2512`); Mistral Medium 3.5 (`mistral-medium-3-5`); Devstral 2512 (`devstral-2512`)                                                                                                                                         |
| OpenAI     | GPT-5.6 Sol (`gpt-5.6-sol`); GPT-5.6 Terra (`gpt-5.6-terra`); GPT-5.6 Luna (`gpt-5.6-luna`); GPT-5.5 (`gpt-5.5`); GPT-5.5 Pro (`gpt-5.5-pro`); GPT-5.4 (`gpt-5.4`); GPT-5.4 Pro (`gpt-5.4-pro`); GPT-5.4 Mini (`gpt-5.4-mini`); GPT-5.4 Nano (`gpt-5.4-nano`) |
| Qwen       | Qwen3.7 Max (`qwen3.7-max`); Qwen3.6 Plus (`qwen3.6-plus`); Qwen3.6 Flash (`qwen3.6-flash`)                                                                                                                                                                   |
| Reka AI    | Reka Flash (`reka-flash`); Reka Edge 2603 (`reka-edge-2603`)                                                                                                                                                                                                  |
| xAI        | Grok 4.3 (`grok-4.3`); Grok Build 0.1 (`grok-build-0.1`)                                                                                                                                                                                                      |
| Z.ai       | GLM-5.1 (`glm-5.1`); GLM-5 (`glm-5`); GLM-5 Turbo (`glm-5-turbo`)                                                                                                                                                                                             |
| Perplexity | Sonar Deep Research (`sonar-deep-research`); Sonar Reasoning Pro (`sonar-reasoning-pro`); Sonar Pro (`sonar-pro`); Sonar (`sonar`)                                                                                                                            |

### Speech to text

| Provider   | Cataloged models and modes                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deepgram   | Nova 3 (`nova-3`, batch and stream); Flux (`flux-general-en`, stream)                                                                                           |
| ElevenLabs | Scribe v2 (`scribe_v2`, batch); Scribe v2 Realtime (`scribe_v2_realtime`, stream)                                                                               |
| Mistral AI | Voxtral Mini 2602 (`voxtral-mini-latest`, batch); Voxtral Mini Transcribe Realtime 2602 (`voxtral-mini-transcribe-realtime-2602`, stream)                       |
| OpenAI     | GPT-4o Transcribe (`gpt-4o-transcribe`, batch); GPT-4o Mini Transcribe (`gpt-4o-mini-transcribe`, batch); GPT Realtime Whisper (`gpt-realtime-whisper`, stream) |
| Qwen       | Qwen3 ASR Flash Realtime (`qwen3-asr-flash-realtime`, stream)                                                                                                   |
| xAI        | xAI STT Batch (`xai-stt-batch`, batch); xAI STT Streaming (`xai-stt-streaming`, stream)                                                                         |

### Text to speech

Every model in this table has a runtime adapter.

| Provider   | Cataloged models                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Cartesia   | Sonic 3.5 (`sonic-3.5`); Sonic 3 (`sonic-3`)                                                                        |
| Deepgram   | Aura 2 (`aura-2`)                                                                                                   |
| ElevenLabs | Eleven v3 (`eleven_v3`); Eleven Multilingual v2 (`eleven_multilingual_v2`); Eleven Flash v2.5 (`eleven_flash_v2_5`) |
| Google     | Gemini 3.1 Flash TTS Preview (`gemini-3.1-flash-tts-preview`)                                                       |
| MiniMax    | Speech 2.8 HD (`speech-2.8-hd`); Speech 2.8 Turbo (`speech-2.8-turbo`)                                              |
| Mistral AI | Voxtral Mini TTS 2603 (`voxtral-mini-tts-2603`)                                                                     |
| OpenAI     | GPT-4o Mini TTS (`gpt-4o-mini-tts`); TTS-1 HD (`tts-1-hd`)                                                          |

### Realtime voice

These models are catalog only. Friday has no realtime-voice IPC or execution service.

| Provider | Cataloged models                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Google   | Gemini 3.1 Flash Live Preview (`gemini-3.1-flash-live-preview`)                                                 |
| Luma AI  | Uni 1.1 (`uni-1.1`)                                                                                             |
| Qwen     | Qwen Omni Realtime (`qwen-omni-realtime`); Qwen3.5 Omni (`qwen3.5-omni`); Qwen3 Omni Flash (`qwen3-omni-flash`) |
| xAI      | Grok Voice Latest (`grok-voice-latest`)                                                                         |

### Image

| Status       | Provider          | Cataloged models                                                                                                             |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Available    | Black Forest Labs | FLUX.2 (`FLUX.2`); FLUX.1 Kontext Pro (`FLUX.1 Kontext [pro]`); FLUX1.1 Pro Ultra (`FLUX1.1 [pro] Ultra`)                    |
| Available    | Google            | Gemini 3.1 Flash Image Preview (`gemini-3.1-flash-image-preview`); Gemini 3 Pro Image Preview (`gemini-3-pro-image-preview`) |
| Available    | Ideogram          | Ideogram 3.0 (`ideogram-3.0`); Ideogram 2a (`ideogram-2a`)                                                                   |
| Available    | Luma AI           | Uni 1.1 (`uni-1.1`)                                                                                                          |
| Catalog only | Midjourney        | Midjourney v8.1 (`midjourney-v8.1`); Midjourney v7 (`midjourney-v7`)                                                         |
| Available    | Qwen              | Qwen Image (`qwen-image`); Qwen Image Edit (`qwen-image-edit`)                                                               |
| Available    | Stability AI      | Stable Image Ultra (`stable-image-ultra`); Stable Image Core (`stable-image-core`)                                           |
| Available    | xAI               | Grok Imagine Image (`grok-imagine-image`); Grok Imagine Image Quality (`grok-imagine-image-quality`)                         |

### Video

| Status       | Provider   | Cataloged models                                                                       |
| ------------ | ---------- | -------------------------------------------------------------------------------------- |
| Available    | Google     | Veo 3.1 (`veo-3.1`); Veo 3.1 Fast (`veo-3.1-fast`)                                     |
| Available    | Kling AI   | Kling v2.5 Turbo (`kling-v2.5-turbo`); Kling v2.1 Master (`kling-v2.1-master`)         |
| Available    | Luma AI    | Ray 3 (`ray-3`); Ray 2 (`ray-2`)                                                       |
| Catalog only | Midjourney | Midjourney Video v1 (`midjourney-video-v1`)                                            |
| Available    | MiniMax    | Hailuo 2.3 (`MiniMax-Hailuo-2.3`); Hailuo 02 (`MiniMax-Hailuo-02`)                     |
| Partial      | Pika       | Pika 2.2 (`pika-2.2`); the adapter uses fal.run while the manifest supplies Pika's URL |
| Available    | Qwen       | Wan 2.5 T2V (`wan2.5-t2v`); Wan 2.2 T2V Plus (`wan2.2-t2v-plus`)                       |
| Available    | Runway     | Gen-4 Turbo (`gen4_turbo`); Gen-3 Alpha Turbo (`gen3a_turbo`)                          |
| Available    | xAI        | Grok Imagine Video 1.5 (`grok-imagine-video-1.5`)                                      |

### Audio and sound effects

| Status       | Provider     | Cataloged models                                                                                                              |
| ------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Available    | ElevenLabs   | Eleven Music (`eleven-music`); ElevenLabs Sound Effects (`elevenlabs-sound-effects`)                                          |
| Catalog only | Google       | Lyria 3 Pro Preview (`lyria-3-pro-preview`); Lyria 3 Clip Preview (`lyria-3-clip-preview`); Lyria Realtime (`lyria-realtime`) |
| Catalog only | Kling AI     | Kling Audio (`kling-audio`)                                                                                                   |
| Catalog only | MiniMax      | Music 2.6 (`music-2.6`); Music Cover (`music-cover`)                                                                          |
| Available    | Stability AI | Stable Audio 2.5 (`stable-audio-2.5`)                                                                                         |
| Catalog only | Suno         | Suno v5.5 (`suno-v5.5`); Suno v4.5 All (`suno-v4.5-all`)                                                                      |

### Embeddings

| Status    | Provider  | Cataloged models                                                                                     |
| --------- | --------- | ---------------------------------------------------------------------------------------------------- |
| Available | Cohere    | Embed v4 (`embed-v4.0`)                                                                              |
| Available | Jina AI   | Jina Embeddings v3 (`jina-embeddings-v3`)                                                            |
| Available | Nomic     | Nomic Embed v2 (`nomic-embed-text-v2-moe`)                                                           |
| Available | OpenAI    | Text Embedding 3 Large (`text-embedding-3-large`); Text Embedding 3 Small (`text-embedding-3-small`) |
| Available | Voyage AI | Voyage 3 Large (`voyage-3-large`)                                                                    |
| Code only | BGE-M3    | No bundled manifest or model ID                                                                      |

The `bge` adapter targets a self-hosted OpenAI-compatible embeddings endpoint. It defaults to
`http://localhost:8080/v1/embeddings`; `BGE_BASE_URL` overrides that endpoint. Because Friday does
not ship a `bge` manifest, it does not appear in the normal model picker unless a compatible custom
manifest supplies the provider and model entry.

### Search, database, and storage

| Area            | Provider   | Service                                                                    |
| --------------- | ---------- | -------------------------------------------------------------------------- |
| Web search      | Brave      | Brave Web Search (`brave-web-search`)                                      |
| Web search      | Tavily     | Tavily Web Search (`tavily-web-search`)                                    |
| Vector database | Pinecone   | Vector Database (`vector-database`)                                        |
| Object storage  | Cloudflare | Object Storage (`object-storage`) through the S3-compatible storage client |

## Custom and plugin providers

Friday merges bundled manifests with provider folders from its application-data `providers`
directory. A local provider with the same normalized ID overrides the bundled manifest. Settings
can open this directory or import a provider folder, and the catalog watches it for changes.

Provider plugins use the same folder shape. See [Friday plugins](PLUGINS.md) for the complete plugin
layout.

A provider manifest requires `providerId`, `providerName`, and a `services` array. Each service
requires `id`, `name`, `type`, and `url`. Optional provider fields include `apiKeyUrl`, image paths,
and provider instructions. Optional model fields include default selection, realtime transcription
metadata, sample rate, and provider-documented input metadata.

Custom chat providers whose ID is not `anthropic` or `openai` are routed through the
OpenAI-compatible Chat Completions client. Other capabilities require an adapter in the
corresponding runtime factory; adding only a manifest makes the service catalog only.

## Source of truth

- Built-in declarations: [`resources/providers`](../resources/providers)
- Manifest schema and validation: [`src/shared/providers/validation.ts`](../src/shared/providers/validation.ts)
- Catalog loading and local overrides: [`src/main/models.ts`](../src/main/models.ts)
- Runtime adapters: [`src/main/models/adapters`](../src/main/models/adapters)
- Search integrations: [`src/main/search`](../src/main/search)
- Pinecone RAG integration: [`src/main/rag`](../src/main/rag)
- S3-compatible storage integration: [`src/main/storage`](../src/main/storage)

When a manifest changes, update this page in the same change and run `npm run quality:check`.
