# Meta Provider

| Property | Value |
| --- | --- |
| Provider id | `meta` |
| Display name | Meta |
| Capabilities | Chat - Video |
| Default base URL | `https://ai.meta.com` |
| Credential type | Llama API key |
| Auth method | API key authentication |
| Recommended env vars | `LLAMA_API_KEY` |
| API-key link | [Meta Llama developer portal](https://llama.developer.meta.com/) |
| Official docs | [Meta Llama API keys](https://llama.developer.meta.com/docs/api-keys/) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `muse-spark`, `llama-4-maverick`, `llama-4-scout` |
| Video Models | `movie-gen-video` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `muse-spark` | `active` |
| `llama-4-maverick` | `active` |
| `llama-4-scout` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `movie-gen-video` | `verify` |

## Related Docs

- [Provider catalog](index.md)
