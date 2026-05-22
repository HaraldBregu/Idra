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

Step id: `operators`

The start page displays this step as `Configure models`. The internal step id
remains `operators` for route/state compatibility. It loads connected providers,
assistant settings, speech-to-text settings, and model lists through the preload
APIs.

Only connected providers are shown in model selectors.

The model catalog and module contracts are documented under `docs/models`:

| Start setup area | Model docs |
| --- | --- |
| Overall model catalog | [Models](../models/index.md) |
| Friday Assistant | [Large language model](../models/large-language-model.md) |
| Voice Input | [Speech to text](../models/speech-to-text.md) |
| Voice Output | [Text to speech](../models/text-to-speech.md) |
| Text To Image | [Text to image](../models/text-to-image.md) |
| Not yet in start setup | [Text to video](../models/text-to-video.md), [Text to audio](../models/music-creator.md), [OCR](../models/ocr.md), [Embedding](../models/embedding.md) |

### Friday Assistant

The assistant operator configures:

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
not persist a text-to-speech operator selection in `handleSaveAgentModel`.

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
added as new model cards if first-run setup needs to configure them.
