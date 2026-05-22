# Settings

Settings is the ongoing configuration area after first-run setup. The settings
layout provides breadcrumbs, a scrollable main region, and a small footer.

## Overview Groups

The settings overview groups navigation cards into:

| Group | Entries |
| --- | --- |
| General | General, System, Providers, Channels |
| Capabilities | Model settings |
| AI Features | Skills, Connectors |
| Automation | Heartbeat, Cron, Task Manager, Apps |

Each overview card navigates to a route from the settings navigation constants.

## Provider Settings

Route: `/settings/providers`

Provider settings use the same provider catalog as the start page. The page
loads saved API key status, shows masked saved keys, and lets the user connect
or edit provider credentials.

Saving uses `window.app.setProviderApiKey(providerId, draft)`.

## Model Settings

Model setting cards are listed in the settings navigation.

| Capability | Route id | UI status |
| --- | --- | --- |
| Assistant | `friday` | Runtime-backed provider/model settings. |
| Speech to text | `speech-to-text` | Runtime-backed provider/transcription model settings. |
| Text to speech | `text-to-speech` | Read-only pending configuration with ElevenLabs / Rachel - multilingual. |
| Text to image | `image-assistant` | Runtime-backed settings page, but model catalog is placeholder unless a provider exposes image models. |
| Text to video | `text-to-video` | Read-only pending configuration with `video-provider-coming-soon`. |
| Text to audio | `music-creator` | Read-only pending configuration with `music-provider-coming-soon`. |

The shared detail page uses one reusable implementation. Assistant,
speech-to-text, and image creator are runtime-backed and can save
provider/model choices. Text-to-speech, video, and audio currently show pending
configuration notices with disabled provider/model selectors.

## Assistant-Specific Settings

The assistant detail page includes:

- Chat history link
- Provider selector
- Model selector
- Reasoning effort selector for OpenAI and DeepSeek providers
- Save action

The save action stores the selected provider/model through the preload API.

## Speech-To-Text Settings

Speech-to-text filters providers to those with available transcription models.
The save action stores the selected provider/transcription model through the
preload API.

The current explicit speech-to-text model catalog is OpenAI
`gpt-realtime-whisper`.

## Future UI Coverage

The docs and store model include additional module settings for text-to-video,
text-to-audio/music, OCR, and embedding. Renderer settings currently expose
pending settings pages for video and audio. A dedicated embedding settings page
is not present in the current renderer navigation.
