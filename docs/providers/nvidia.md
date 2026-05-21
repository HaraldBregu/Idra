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

Default agent models:

| Model id | Display name |
| --- | --- |
| `nemotron-ultra-latest` | Nemotron Ultra / latest |
| `llama-nemotron-super` | Llama Nemotron Super |
| `llama-nemotron-nano` | Llama Nemotron Nano |
| `nemotron-vl` | Nemotron VL |

Speech-to-text models:

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

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Hosted NVIDIA NIM endpoints use NVIDIA API keys; self-hosted NIM deployments
  may use different auth.
- Friday does not save or pass reasoning effort for NVIDIA.

Example:

```json
{
	"message": "Explain the performance bottlenecks in this trace.",
	"providerId": "nvidia",
	"model": "nemotron-ultra-latest"
}
```

## Related Docs

- [Provider catalog](index.md)
