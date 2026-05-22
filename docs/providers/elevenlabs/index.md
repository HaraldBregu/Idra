# ElevenLabs Provider

| Property | Value |
| --- | --- |
| Provider id | `elevenlabs` |
| Display name | ElevenLabs |
| Capabilities | Speech-to-text - Text-to-speech - Music/audio |
| Default base URL | `https://api.elevenlabs.io/v1` |
| Credential type | API key |
| Auth method | `xi-api-key` header |
| Recommended env vars | `ELEVENLABS_API_KEY` |
| API-key link | [ElevenLabs API keys](https://elevenlabs.io/app/settings/api-keys) |
| Official docs | [ElevenLabs authentication docs](https://elevenlabs.io/docs/api-reference/authentication), [Speech to Text overview](https://elevenlabs.io/docs/overview/capabilities/speech-to-text) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Speech-To-Text Models | `scribe_v2`, `scribe_v2_realtime` |
| Text-To-Speech Models | `eleven_v3`, `eleven_multilingual_v2`, `eleven_flash_v2_5` |
| Music And Audio Models | `eleven-music`, `elevenlabs-sound-effects` |

## Speech-To-Text Models

| Model id | Status |
| --- | --- |
| `scribe_v2` | `active` |
| `scribe_v2_realtime` | `active` |

### Speech-To-Text Usage

Official ElevenLabs docs checked on 2026-05-22:

- [Speech to Text overview](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)
- [Batch Speech to Text quickstart](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text)
- [Create transcript API reference](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)
- [Realtime Speech to Text API reference](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime)
- [Realtime transcripts and commit strategies](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/transcripts-and-commit-strategies)
- [Realtime event reference](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/event-reference)

| Model id | Official ElevenLabs path | Use when |
| --- | --- | --- |
| `scribe_v2` | `POST /v1/speech-to-text` | Transcribing uploaded or hosted audio/video files, with optional diarization, timestamps, keyterms, entity detection, redaction, multichannel transcription, or webhook delivery. |
| `scribe_v2_realtime` | `wss://api.elevenlabs.io/v1/speech-to-text/realtime` | Streaming live microphone, file, URL, or server audio and receiving partial and committed transcripts with low latency. |

#### `scribe_v2`

Use this model with ElevenLabs' batch Speech to Text API. Send a multipart form
request with `model_id="scribe_v2"` and exactly one audio source such as `file` or
`source_url`.

```bash
curl -X POST "https://api.elevenlabs.io/v1/speech-to-text" \
	-H "xi-api-key: $ELEVENLABS_API_KEY" \
	-H "Content-Type: multipart/form-data" \
	-F model_id="scribe_v2" \
	-F file=@meeting.mp3 \
	-F language_code="eng" \
	-F diarize="true" \
	-F timestamps_granularity="word"
```

The synchronous response returns transcript text plus metadata such as detected
language and word entries. Useful options include `tag_audio_events`,
`num_speakers`, `diarize`, `timestamps_granularity`, `use_multi_channel`,
`keyterms`, `entity_detection`, `entity_redaction`, `no_verbatim`, `temperature`,
and `seed`. Set `webhook=true` and optionally `webhook_id` or `webhook_metadata`
when the transcript should be delivered asynchronously through configured
Speech-to-Text webhooks.

#### `scribe_v2_realtime`

Use this model with ElevenLabs' realtime WebSocket API. Connect with
`model_id=scribe_v2_realtime`, authenticate with the `xi-api-key` header on the
server or a single-use `token` query parameter in a client, then stream
`input_audio_chunk` messages.

```ts
import { AudioFormat, RealtimeEvents, Scribe } from '@elevenlabs/client';

const connection = Scribe.connect({
	token,
	modelId: 'scribe_v2_realtime',
	audioFormat: AudioFormat.PCM_16000,
	sampleRate: 16000,
	includeTimestamps: true,
	commitStrategy: 'vad',
});

connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (event) => {
	process.stdout.write(event.text);
});

connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (event) => {
	console.log('\nCommitted:', event.text);
});
```

For raw WebSocket integrations, send base64 audio chunks with
`message_type="input_audio_chunk"` and commit manually by setting `commit=true`,
or set `commit_strategy=vad` to let voice activity detection finalize segments.
Supported audio formats are `pcm_8000`, `pcm_16000`, `pcm_22050`, `pcm_24000`,
`pcm_44100`, `pcm_48000`, and `ulaw_8000`; ElevenLabs recommends 16 kHz mono PCM
for a balance of quality and bandwidth. Handle `session_started`,
`partial_transcript`, `committed_transcript`, `committed_transcript_with_timestamps`,
and error events.

## Text-To-Speech Models

| Model id | Status |
| --- | --- |
| `eleven_v3` | `active` |
| `eleven_multilingual_v2` | `active` |
| `eleven_flash_v2_5` | `active` |

## Music And Audio Models

| Model id | Status |
| --- | --- |
| `eleven-music` | `active` |
| `elevenlabs-sound-effects` | `active` |

## Related Docs

- [Provider catalog](index.md)
