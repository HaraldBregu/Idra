# Mistral AI Provider

| Property | Value |
| --- | --- |
| Provider id | `mistral` |
| Display name | Mistral AI |
| Capabilities | Chat - Speech-to-text - Text-to-speech |
| Default base URL | `https://api.mistral.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `MISTRAL_API_KEY` |
| API-key link | [Mistral API keys](https://admin.mistral.ai/organization/api-keys) |
| Official docs | [Mistral quickstarts](https://docs.mistral.ai/getting-started/quickstarts), [audio transcription](https://docs.mistral.ai/studio-api/audio/speech_to_text) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `mistral-large-2512`, `mistral-medium-3-5`, `devstral-2512` |
| Speech-To-Text Models | `voxtral-mini-2602`, `voxtral-mini-transcribe-realtime-2602` |
| Text-To-Speech Models | `voxtral-tts-2603` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `mistral-large-2512` | `active` |
| `mistral-medium-3-5` | `active` |
| `devstral-2512` | `active` |

## Speech-To-Text Models

| Model id | Status |
| --- | --- |
| `voxtral-mini-2602` | `active` |
| `voxtral-mini-transcribe-realtime-2602` | `active` |

### Speech-To-Text Usage

Official Mistral docs checked on 2026-05-22:

- [Speech-to-text overview](https://docs.mistral.ai/studio-api/audio/speech_to_text)
- [Offline transcription](https://docs.mistral.ai/studio-api/audio/speech_to_text/offline_transcription)
- [Realtime transcription](https://docs.mistral.ai/studio-api/audio/speech_to_text/realtime_transcription)
- [Voxtral Mini Transcribe model card](https://docs.mistral.ai/getting-started/models/models_overview/#voxtral-mini-transcribe)

| Model id | Official Mistral path | Use when |
| --- | --- | --- |
| `voxtral-mini-2602` | `POST /v1/audio/transcriptions` | Transcribing an existing audio file, uploaded file id, or public file URL. |
| `voxtral-mini-transcribe-realtime-2602` | `wss://api.mistral.ai/v1/audio/transcriptions/realtime` | Live microphone or streaming PCM audio transcription. |

#### `voxtral-mini-2602`

Use this model with Mistral's offline transcription API. The official examples may use
the alias `voxtral-mini-latest`; use the fixed catalog id `voxtral-mini-2602` when
Friday stores or sends the selected model id.

With the Mistral TypeScript SDK:

```ts
import { Mistral } from '@mistralai/mistralai';

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const transcript = await client.audio.transcriptions.complete({
	model: 'voxtral-mini-2602',
	fileUrl: 'https://example.com/audio.mp3',
	language: 'en',
	diarize: true,
	timestampGranularities: ['segment'],
	contextBias: ['Friday', 'Mistral'],
});
```

The request can provide one audio source: `file`, `fileUrl`, or `fileId`. Optional
fields include `language`, `temperature`, `diarize`, `contextBias`, and
`timestampGranularities`. For server-sent incremental output from an existing audio
file, use the same model with `client.audio.transcriptions.stream(...)`; this is not
the realtime microphone API.

#### `voxtral-mini-transcribe-realtime-2602`

Use this model with Mistral's realtime transcription WebSocket API. Send audio as raw
PCM chunks and declare the audio encoding and sample rate when opening or updating
the session.

With the Mistral TypeScript SDK:

```ts
import {
	AudioEncoding,
	RealtimeTranscription,
} from '@mistralai/mistralai/extra/realtime';

const client = new RealtimeTranscription({
	apiKey: process.env.MISTRAL_API_KEY,
	serverURL: 'wss://api.mistral.ai',
});

for await (const event of client.transcribeStream(
	audioChunks,
	'voxtral-mini-transcribe-realtime-2602',
	{
		audioFormat: {
			encoding: AudioEncoding.PcmS16le,
			sampleRate: 16000,
		},
	}
)) {
	if (event.type === 'transcription.text.delta') {
		process.stdout.write(event.text);
	}
}
```

`audioChunks` must be an `AsyncIterable<Uint8Array>` of audio bytes in the declared
format. The SDK opens the WebSocket at
`/v1/audio/transcriptions/realtime?model=voxtral-mini-transcribe-realtime-2602`,
sends audio chunks, flushes the buffer, and ends the audio stream. Handle
`transcription.text.delta` for partial text, `transcription.done` for completion,
and `error` for provider failures.

## Text-To-Speech Models

| Model id | Status |
| --- | --- |
| `voxtral-tts-2603` | `active` |

## Related Docs

- [Provider catalog](index.md)
