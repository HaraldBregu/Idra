# NVIDIA Provider

| Property | Value |
| --- | --- |
| Provider id | `nvidia` |
| Display name | NVIDIA |
| Capabilities | Chat |
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
