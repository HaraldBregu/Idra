# NVIDIA Provider

| Property | Value |
| --- | --- |
| Provider id | `nvidia` |
| Display name | NVIDIA |
| Capabilities | Chat - Speech-to-text |
| Default base URL | `https://integrate.api.nvidia.com/v1` |
| Credential type | NVIDIA API key / NGC API key depending on service |
| Auth method | Bearer token for hosted NVIDIA NIM endpoints; NGC key for NGC services |
| Recommended env vars | `NVIDIA_API_KEY`, `NGC_API_KEY` |
| API-key link | [NVIDIA API keys](https://build.nvidia.com/settings/api-keys) |
| Official docs | [NVIDIA NIM getting started](https://docs.nvidia.com/nim/large-language-models/latest/getting-started.html) |

## Model Type Coverage

Official model references were checked in May 2026. NVIDIA may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Hosted and self-hosted NIM LLM families including Llama, Nemotron, DeepSeek, Qwen, Mistral, Gemma, Granite, and other optimized profiles. Official references: [NVIDIA NIM for LLMs](https://docs.nvidia.com/nim/large-language-models/latest/index.html), [NIM support matrix](https://docs.nvidia.com/nim/large-language-models/latest/reference/support-matrix.html). | Friday has an explicit default agent catalog for NVIDIA. |
| Speech-To-Text Models | NIM for Automatic Speech Recognition and NVIDIA Speech/Riva ASR model services. Official references: [NVIDIA NIM docs](https://docs.nvidia.com/nim/index.html). | Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for NVIDIA STT. |
| Text-To-Speech Models | NIM for Text-To-Speech and NVIDIA Speech/Riva TTS model services. Official references: [NVIDIA NIM docs](https://docs.nvidia.com/nim/index.html). | Friday does not currently list NVIDIA in the TTS provider catalog. |
| Vision And Embedding Models | NIM for Vision Language Models, text embedding, text reranking, image OCR, object detection, NV-CLIP, and visual generative AI. Official references: [NVIDIA NIM docs](https://docs.nvidia.com/nim/index.html). | Friday has no NVIDIA vision, embedding, rerank, OCR, or visual-generation catalog yet. |

## Large Language Models

Official references: [NVIDIA NIM for LLMs](https://docs.nvidia.com/nim/large-language-models/latest/index.html), [NIM support matrix](https://docs.nvidia.com/nim/large-language-models/latest/reference/support-matrix.html).

Official model families: Hosted and self-hosted NIM LLM families including Llama, Nemotron, DeepSeek, Qwen, Mistral, Gemma, Granite, and other optimized profiles.

Friday status: Friday has an explicit default agent catalog for NVIDIA.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `nemotron-ultra-latest` | Nemotron Ultra / latest |
| `llama-nemotron-super` | Llama Nemotron Super |
| `llama-nemotron-nano` | Llama Nemotron Nano |
| `nemotron-vl` | Nemotron VL |

## Speech-To-Text Models

Official references: [NVIDIA NIM docs](https://docs.nvidia.com/nim/index.html).

Official model families: NIM for Automatic Speech Recognition and NVIDIA Speech/Riva ASR model services.

Friday status: Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for NVIDIA STT.

Documented provider model ids:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `nemotron-asr-streaming` | Nemotron ASR Streaming | Realtime transcription |
| `parakeet-1.1b-rnnt-multilingual-asr` | Parakeet 1.1B RNNT Multilingual ASR | ASR transcription |
| `parakeet-tdt-0.6b-v2` | Parakeet TDT 0.6B v2 | ASR transcription |
| `parakeet-ctc-1.1b-asr` | Parakeet CTC 1.1B ASR | ASR transcription |
| `parakeet-ctc-0.6b-asr` | Parakeet CTC 0.6B ASR | ASR transcription |
| `parakeet-ctc-0.6b-zh-tw` | Parakeet CTC 0.6B zh-TW | Mandarin Taiwanese English transcription |
| `parakeet-ctc-0.6b-vi` | Parakeet CTC 0.6B vi | Vietnamese-English transcription |
| `parakeet-ctc-0.6b-zh-cn` | Parakeet CTC 0.6B zh-CN | Mandarin-English transcription |
| `parakeet-ctc-0.6b-es` | Parakeet CTC 0.6B es | Spanish-English transcription |
| `canary-1b-asr` | Canary 1B ASR | Speech-to-text recognition and translation |
| `whisper-large-v3` | Whisper Large v3 | ASR transcription through NVIDIA NIM catalog |

## Text-To-Speech Models

Official references: [NVIDIA NIM docs](https://docs.nvidia.com/nim/index.html).

Official model families: NIM for Text-To-Speech and NVIDIA Speech/Riva TTS model services.

Friday status: Friday does not currently list NVIDIA in the TTS provider catalog.

## Vision And Embedding Models

Official references: [NVIDIA NIM docs](https://docs.nvidia.com/nim/index.html).

Official model families: NIM for Vision Language Models, text embedding, text reranking, image OCR, object detection, NV-CLIP, and visual generative AI.

Friday status: Friday has no NVIDIA vision, embedding, rerank, OCR, or visual-generation catalog yet.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Hosted NVIDIA NIM endpoints use NVIDIA API keys; self-hosted NIM deployments
  may use different auth.
- Friday does not save or pass reasoning effort for NVIDIA.

## Example

```json
{
	"message": "Explain the performance bottlenecks in this trace.",
	"providerId": "nvidia",
	"model": "nemotron-ultra-latest"
}
```

## Related Docs

- [Provider catalog](index.md)
