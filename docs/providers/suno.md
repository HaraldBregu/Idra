# Suno Provider

| Property | Value |
| --- | --- |
| Provider id | `suno` |
| Display name | Suno |
| Capabilities | Music |
| Default base URL | `https://suno.com` |
| Credential type | No generally available official Suno API key found |
| Auth method | None configured |
| Recommended env vars | None |
| API-key link | None configured |
| Official docs | None configured |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- The constants intentionally do not link to third-party Suno API sites.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "suno",
	"baseUrl": "https://suno.com",
	"officialApiKeyManagement": false
}
```

## Related Docs

- [Provider catalog](index.md)
