# OpenAI Provider

| Property | Value |
| --- | --- |
| Provider id | `openai` |
| Display name | OpenAI |
| Capabilities | Chat - Speech-to-text - Text-to-speech - Image - Video |
| Default base URL | `https://api.openai.com/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `OPENAI_API_KEY` |
| API-key link | [OpenAI API keys](https://platform.openai.com/api-keys) |
| Official docs | [OpenAI quickstart](https://developers.openai.com/api/docs/quickstart) |

## Model Type Coverage

Official model references were checked in May 2026. OpenAI may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | GPT frontier, reasoning, chat, Codex, deep-research, search-preview, moderation, and open-weight GPT-OSS model families. Official references: [OpenAI models](https://platform.openai.com/docs/models). | Friday has an explicit default agent catalog for OpenAI. |
| Speech-To-Text Models | GPT-4o Transcribe, GPT-4o mini Transcribe, GPT-4o Transcribe Diarize, Whisper, and realtime transcription-capable audio models. Official references: [OpenAI models](https://platform.openai.com/docs/models), [Audio and speech](https://platform.openai.com/docs/guides/audio). | Friday currently stores `gpt-realtime-whisper` for realtime transcription; file transcription entries are documented provider models until the STT module grows a broader OpenAI catalog. |
| Text-To-Speech Models | GPT-4o mini TTS, TTS-1, TTS-1 HD, and realtime/audio models capable of speech output. Official references: [OpenAI models](https://platform.openai.com/docs/models), [Audio API reference](https://platform.openai.com/docs/api-reference/audio). | Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for OpenAI TTS. |
| Image Models | GPT Image 1.5, ChatGPT Image, GPT Image 1, GPT Image mini, plus deprecated DALL-E generations. Official references: [OpenAI models](https://platform.openai.com/docs/models). | Friday exposes the shared `image-provider-coming-soon` placeholder for OpenAI image generation. |
| Video Models | Sora 2 and Sora 2 Pro video generation. Official references: [Video generation with Sora](https://platform.openai.com/docs/guides/video-generation), [OpenAI models](https://platform.openai.com/docs/models). | Friday exposes the shared `video-provider-coming-soon` placeholder for OpenAI video generation. |
| Embedding Models | text-embedding-3-large, text-embedding-3-small, and text-embedding-ada-002. Official references: [OpenAI models](https://platform.openai.com/docs/models). | Friday has no default embedding provider catalog yet. |

## Large Language Models

Official references: [OpenAI models](https://platform.openai.com/docs/models).

Official model families: GPT frontier, reasoning, chat, Codex, deep-research, search-preview, moderation, and open-weight GPT-OSS model families.

Friday status: Friday has an explicit default agent catalog for OpenAI.

Friday default agent models:

| Model id | Display name | Effort support |
| --- | --- | --- |
| `gpt-5.5` | GPT-5.5 | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.5-pro` | GPT-5.5 Pro | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4` | GPT-5.4 | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4-pro` | GPT-5.4 Pro | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4-mini` | GPT-5.4 Mini | `none`, `low`, `medium`, `high`, `xhigh`; default `medium` |

## Speech-To-Text Models

Official references: [OpenAI models](https://platform.openai.com/docs/models), [Audio and speech](https://platform.openai.com/docs/guides/audio).

Official model families: GPT-4o Transcribe, GPT-4o mini Transcribe, GPT-4o Transcribe Diarize, Whisper, and realtime transcription-capable audio models.

Friday status: Friday currently stores `gpt-realtime-whisper` for realtime transcription; file transcription entries are documented provider models until the STT module grows a broader OpenAI catalog.

Documented provider model ids:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `gpt-realtime-whisper` | GPT Realtime Whisper | Realtime transcription |
| `gpt-4o-transcribe` | GPT-4o Transcribe | File transcription |
| `gpt-4o-mini-transcribe` | GPT-4o mini Transcribe | File transcription |
| `gpt-4o-transcribe-diarize` | GPT-4o Transcribe Diarize | File transcription with diarization |
| `whisper-1` | Whisper | File transcription and translation |

## Text-To-Speech Models

Official references: [OpenAI models](https://platform.openai.com/docs/models), [Audio API reference](https://platform.openai.com/docs/api-reference/audio).

Official model families: GPT-4o mini TTS, TTS-1, TTS-1 HD, and realtime/audio models capable of speech output.

Friday status: Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for OpenAI TTS.

## Image Models

Official references: [OpenAI models](https://platform.openai.com/docs/models).

Official model families: GPT Image 1.5, ChatGPT Image, GPT Image 1, GPT Image mini, plus deprecated DALL-E generations.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for OpenAI image generation.

## Video Models

Official references: [Video generation with Sora](https://platform.openai.com/docs/guides/video-generation), [OpenAI models](https://platform.openai.com/docs/models).

Official model families: Sora 2 and Sora 2 Pro video generation.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for OpenAI video generation.

## Embedding Models

Official references: [OpenAI models](https://platform.openai.com/docs/models).

Official model families: text-embedding-3-large, text-embedding-3-small, and text-embedding-ada-002.

Friday status: Friday has no default embedding provider catalog yet.

## Runtime Notes

- Uses the native OpenAI Responses adapter.
- Function tools are sent as Responses API tools with `strict: false`.
- Reasoning items are preserved in the transcript as OpenAI reasoning blocks.
- Context overflow errors are normalized into `ContextOverflowError` for one
  compaction retry by the agent loop.

## Example

```json
{
	"message": "Plan the implementation and apply the smallest safe patch.",
	"providerId": "openai",
	"model": "gpt-5.5",
	"effort": "high"
}
```

## Related Docs

- [Provider catalog](index.md)
