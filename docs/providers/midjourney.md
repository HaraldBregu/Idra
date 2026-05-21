# Midjourney Provider

| Property | Value |
| --- | --- |
| Provider id | `midjourney` |
| Display name | Midjourney |
| Capabilities | Image - Video |
| Default base URL | `https://www.midjourney.com` |
| Credential type | No generally available official API key found |
| Auth method | None configured |
| Recommended env vars | None |
| API-key link | None configured |
| Official docs | [Midjourney help center](https://docs.midjourney.com/hc/en-us) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- The constants intentionally do not provide an official public API-key
  management link.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "midjourney",
	"baseUrl": "https://www.midjourney.com",
	"officialApiKeyManagement": false
}
```

## Related Docs

- [Provider catalog](index.md)
