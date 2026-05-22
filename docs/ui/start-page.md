# Start Page

Source: `src/renderer/src/pages/start/StartPage.tsx`

The start page is the first-run experience users see before landing on Home.
It is a three-step setup flow with a fixed top skip action, scrollable content,
footer progress, back/continue controls, and inline error notices.

## Step 1: Presentation

Step id: `welcome`

The presentation step introduces Friday and explains that setup connects one AI
provider, chooses the assistant model, and enables tool support. The UI shows:

- `DomeWaveAnimation`
- A setup-time badge
- `Welcome to Friday`
- A short setup explanation
- Primary action: `Get started`
- Optional `Skip`, which navigates directly to `/home`

## Step 2: Provider Setup

Step id: `providers`

This step lists every `DEFAULT_PROVIDERS` entry from `src/shared/providers.ts`.
Each provider card shows the provider avatar, display name, API setup link,
capability text or masked saved key, and a connect/edit action.

When editing a provider, the card expands with:

- Password API key input
- `Cancel`
- `Save`
- Per-provider saving spinner

The continue action is disabled until at least one provider has a saved key or
an unsaved key draft. API keys are saved through `window.app.setProviderApiKey`.
Saved status is loaded through `window.app.isProviderApiKeySaved`.

Provider credentials are described to the user as local app data. The renderer
does not expose provider secrets back to the UI; saved keys are displayed as a
masked placeholder.

## Provider Catalog

| Provider id | Display name | Capabilities |
| --- | --- | --- |
| `openai` | OpenAI | Chat - Speech-to-text - Text-to-speech - Image - Video |
| `anthropic` | Anthropic | Chat |
| `google` | Google DeepMind / Google | Chat - Speech-to-text - Text-to-speech - Image - Video - Music |
| `meta` | Meta | Chat - Video |
| `xai` | xAI | Chat - Realtime voice - Image - Video |
| `mistral` | Mistral AI | Chat - Speech-to-text - Text-to-speech |
| `deepseek` | DeepSeek | Chat |
| `qwen` | Alibaba / Qwen / Wan | Chat - Omni - Image - Video |
| `kimi` | Moonshot AI / Kimi | Chat |
| `zai` | Z.ai / Zhipu AI | Chat |
| `minimax` | MiniMax | Chat - Text-to-speech - Video - Music |
| `elevenlabs` | ElevenLabs | Speech-to-text - Text-to-speech - Audio - Music |
| `deepgram` | Deepgram | Speech-to-text - Text-to-speech |
| `cartesia` | Cartesia | Text-to-speech |
| `black-forest-labs` | Black Forest Labs | Image |
| `midjourney` | Midjourney | Image - Video |
| `kling` | Kuaishou / Kling AI | Image - Video - Audio |
| `runway` | Runway | Video |
| `luma` | Luma AI | Omni - Image - Video - 3D |
| `stability-ai` | Stability AI | Image - Video - Audio |
| `ideogram` | Ideogram | Image |
| `pika` | Pika | Video |
| `suno` | Suno | Music |
| `reka` | Reka AI | Chat |
| `perplexity` | Perplexity | Research chat |

## Step 3: Configure Models

The start page displays this step as `Configure models`. It loads connected
providers, assistant settings, speech-to-text settings, and model lists through
the preload APIs.

Only connected providers are shown in model selectors. The reference for this
step is [docs/models/index.md](../models/index.md); the tables below mirror the
model families, store keys, support levels, and runtime status documented
there.

### Step 3 Model Reference

| Start setup card | Model family from `docs/models` | Store key | Support level | Runtime status |
| --- | --- | --- | --- | --- |
| Friday Assistant | [Large language model](../models/large-language-model.md) | `llmAgent` | Explicit model catalog | Implemented |
| Voice Input | [Speech to text](../models/speech-to-text.md) | `speechToText` | OpenAI explicit model plus provider placeholders | Implemented for OpenAI realtime |
| Voice Output | [Text to speech](../models/text-to-speech.md) | `textToSpeech` | ElevenLabs explicit model plus provider placeholders | Pending runtime |
| Text To Image | [Text to image](../models/text-to-image.md) | `imageCreator` | Provider-keyed placeholder catalog | Service, task, and tool path exist; provider adapters pending |

### Assistant Model Coverage

The Friday Assistant card uses the LLM agent model catalog from
[large-language-model.md](../models/large-language-model.md). The selector is
populated by `window.app.getModels(provider)` for connected providers only.

| Provider id | Model ids from `docs/models` |
| --- | --- |
| `openai` | `gpt-5.5`, `gpt-5.5-pro`, `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.4-mini` |
| `anthropic` | `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-sonnet-4-5`, `claude-haiku-4-5` |
| `google` | `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` |
| `meta` | `llama-4-maverick`, `llama-4-scout`, `llama-3.3-70b` |
| `xai` | `grok-4.3`, `grok-4.3-fast`, `grok-code-fast` |
| `mistral` | `mistral-large-2512`, `mistral-large-latest`, `mistral-medium-2604`, `mistral-medium-latest`, `mistral-medium-2508`, `mistral-small-2603`, `mistral-small-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-8b-2512`, `ministral-8b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `magistral-medium-2509`, `magistral-medium-latest` |
| `deepseek` | `deepseek-v4-pro`, `deepseek-v4-flash` |
| `qwen` | `qwen3-max`, `qwen3.5-plus`, `qwen3.5-flash`, `qwen3-coder-plus`, `qwq-plus` |
| `kimi` | `kimi-k2.6`, `kimi-k2.5`, `kimi-k2`, `kimi-latest` |
| `zai` | `glm-5.1`, `glm-5`, `glm-4.6`, `glm-4.5v`, `glm-z1` |
| `minimax` | `minimax-m2.7` |
| `luma` | `uni-1` |
| `reka` | `reka-core`, `reka-flash`, `reka-edge` |
| `perplexity` | `sonar-reasoning-pro`, `sonar-pro`, `sonar-deep-research`, `r1-1776` |

### Voice Input Model Coverage

The Voice Input card uses the speech-to-text catalog from
[speech-to-text.md](../models/speech-to-text.md). The selector is populated by
`window.app.getSpeechToTextModels(provider)` for connected providers only.

| Provider id | Model id | Start setup status |
| --- | --- | --- |
| `openai` | `gpt-realtime-whisper` | Concrete selectable transcription model |
| `google` | `speech-to-text-provider-coming-soon` | Placeholder catalog entry |
| `xai` | `speech-to-text-provider-coming-soon` | Placeholder catalog entry |
| `mistral` | `speech-to-text-provider-coming-soon` | Placeholder catalog entry |
| `qwen` | `speech-to-text-provider-coming-soon` | Placeholder catalog entry |
| `elevenlabs` | `speech-to-text-provider-coming-soon` | Placeholder catalog entry |
| `deepgram` | `speech-to-text-provider-coming-soon` | Placeholder catalog entry |

### Voice Output Model Coverage

The Voice Output card references the text-to-speech catalog from
[text-to-speech.md](../models/text-to-speech.md). The start page currently
renders only the concrete ElevenLabs option and does not save a text-to-speech
model from `handleSaveAgentModel`.

| Provider id | Model id | Start setup status |
| --- | --- | --- |
| `elevenlabs` | `rachel-multilingual` | Rendered concrete model entry |
| `openai` | `text-to-speech-provider-coming-soon` | Not rendered in start setup |
| `google` | `text-to-speech-provider-coming-soon` | Not rendered in start setup |
| `mistral` | `text-to-speech-provider-coming-soon` | Not rendered in start setup |
| `minimax` | `text-to-speech-provider-coming-soon` | Not rendered in start setup |
| `deepgram` | `text-to-speech-provider-coming-soon` | Not rendered in start setup |
| `cartesia` | `text-to-speech-provider-coming-soon` | Not rendered in start setup |

### Text To Image Model Coverage

The Text To Image card references the text-to-image catalog from
[text-to-image.md](../models/text-to-image.md). The start page renders this as a
disabled placeholder card.

| Provider id | Model id | Start setup status |
| --- | --- | --- |
| `openai` | `image-provider-coming-soon` | Placeholder catalog entry |
| `google` | `image-provider-coming-soon` | Placeholder catalog entry |
| `xai` | `image-provider-coming-soon` | Placeholder catalog entry |
| `qwen` | `image-provider-coming-soon` | Placeholder catalog entry |
| `black-forest-labs` | `image-provider-coming-soon` | Placeholder catalog entry |
| `midjourney` | `image-provider-coming-soon` | Placeholder catalog entry |
| `kling` | `image-provider-coming-soon` | Placeholder catalog entry |
| `luma` | `image-provider-coming-soon` | Placeholder catalog entry |
| `stability-ai` | `image-provider-coming-soon` | Placeholder catalog entry |
| `ideogram` | `image-provider-coming-soon` | Placeholder catalog entry |

### Model Families Not Rendered In Step 3

| Model family from `docs/models` | Store key | Start setup status |
| --- | --- | --- |
| [Text to video](../models/text-to-video.md) | `textToVideo` | Settings-only / future setup card |
| [Text to audio](../models/music-creator.md) | `textToSound` | Settings-only / future setup card |
| [OCR](../models/ocr.md) | `ocr` | Settings-only / future setup card |
| [Embedding](../models/embedding.md) | `embedding` | Not exposed until the default catalog is populated |

### Friday Assistant

The assistant model card configures:

- Provider
- Assistant model

Models are loaded with `window.app.getModels(provider)`. Saving uses
`window.app.saveAssistantOperator(provider, model)` and then navigates to
`/home`.

### Voice Input

Voice input configures speech-to-text:

- Provider
- Transcription model

Models are loaded with `window.app.getSpeechToTextModels(provider)`. Saving uses
`window.app.saveSpeechToTextOperator(provider, model)` when a speech model is
selected. If no connected provider has speech-to-text models, the UI shows a
notice asking the user to connect a capable provider.

### Voice Output

Voice output displays text-to-speech settings:

- Provider: `elevenlabs`
- Voice model: `rachel-multilingual` / Rachel - multilingual

This selection is rendered in the start flow, but the start page currently does
not persist a text-to-speech model selection in `handleSaveAgentModel`.

### Text To Image

Text to Image is shown as a placeholder:

- Provider: Image provider
- Image model: `image-provider-coming-soon` / Not available yet

The panel is disabled and includes a notice that image creation is not
configurable yet.

## Not Yet In Start Setup

The broader model catalog includes text-to-video, text-to-audio/music, OCR,
embedding, cron tasks, and background tasks. The current start page does not
render those setup controls. They should either remain in Settings only or be
added as new model cards if first-run setup needs to configure them. Update the
matching `docs/models` page first, then update this start-page summary.
