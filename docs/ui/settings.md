# Settings And Operators

Sources:

- `src/renderer/src/pages/settings/Layout.tsx`
- `src/renderer/src/pages/settings/pages/overview/Page.tsx`
- `src/renderer/src/pages/settings/navigation.ts`
- `src/renderer/src/pages/settings/pages/operators/details/Page.tsx`

Settings is the ongoing configuration area after first-run setup. The settings
layout provides breadcrumbs, a scrollable main region, and a small footer.

## Overview Groups

The settings overview groups navigation cards into:

| Group | Entries |
| --- | --- |
| General | General, System, Providers, Channels |
| Capabilities | Operators, Skills, Connectors |
| Automation | Heartbeat, Cron, Task Manager, Apps |

Each overview card navigates to a route in `SETTINGS_NAVIGATION` or
`SETTINGS_OPERATOR_ITEMS`.

## Provider Settings

Route: `/settings/providers`

Provider settings use the same provider catalog as the start page. The page
loads saved API key status, shows masked saved keys, and lets the user connect
or edit provider credentials.

Saving uses `window.app.setProviderApiKey(providerId, draft)`.

## Operator Settings

Operator cards are defined by `SETTINGS_OPERATOR_ITEMS`.

| Operator | Route id | UI status |
| --- | --- | --- |
| Friday Assistant | `friday` | Runtime-backed provider/model settings. |
| Speech to text | `speech-to-text` | Runtime-backed provider/transcription model settings. |
| Text to speech | `text-to-speech` | Read-only pending configuration with ElevenLabs / Rachel - multilingual. |
| Image creator | `image-assistant` | Runtime-backed settings page, but model catalog is placeholder unless a provider exposes image models. |
| Video creator | `video-creator` | Read-only pending configuration with `video-provider-coming-soon`. |
| Music creator | `music-creator` | Read-only pending configuration with `music-provider-coming-soon`. |
| Document reader OCR | `document-reader` | Read-only pending configuration with `document-reader-provider-coming-soon`. |
| Cron task scheduler | `cron-task-scheduler` | Workflow-backed page that links to Cron configuration. |
| Background task | `background-task` | Workflow-backed page that links to Task Manager. |

The operator detail page uses one reusable implementation. Assistant,
speech-to-text, and image creator are runtime-backed and can save provider/model
choices. Text-to-speech, video, music, and OCR currently show pending
configuration notices with disabled provider/model selectors.

## Assistant-Specific Settings

The assistant operator details page includes:

- Chat history link
- Provider selector
- Model selector
- Reasoning effort selector for OpenAI and DeepSeek providers
- Save action

Assistant saves use `window.app.saveAssistantOperator(provider, model)`.

## Speech-To-Text Settings

Speech-to-text filters providers to those with available transcription models.
It saves through `window.app.saveSpeechToTextOperator(provider, model)`.

The current explicit speech-to-text model catalog is OpenAI
`gpt-realtime-whisper`.

## Future UI Coverage

The docs and store model include additional module settings for text-to-video,
text-to-audio/music, OCR, and embedding. Renderer settings currently expose
pending operator pages for video, music, and OCR. A dedicated embedding settings
page is not present in the current renderer navigation.

