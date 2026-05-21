# Baidu Provider

| Property | Value |
| --- | --- |
| Provider id | `baidu` |
| Display name | Baidu |
| Capabilities | Chat - Speech-to-text - Omni - Image |
| Default base URL | `https://qianfan.baidubce.com/v2` |
| Credential type | Qianfan API key / access token credentials |
| Auth method | Qianfan API key or access-token flow depending on API generation |
| Recommended env vars | `QIANFAN_API_KEY`, `QIANFAN_SECRET_KEY`, `QIANFAN_ACCESS_KEY`, `QIANFAN_SECRET_ACCESS_KEY` |
| API-key link | [Baidu Qianfan application console](https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application) |
| Official docs | [Baidu Qianfan API docs](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `ernie-5.1` | ERNIE 5.1 |
| `ernie-5.0` | ERNIE 5.0 |
| `ernie-x1.1` | ERNIE X1.1 |
| `ernie-4.5` | ERNIE 4.5 |

Speech-to-text models:

| Model id or code | Display name | Runtime style |
| --- | --- | --- |
| `audio-mini-realtime-near` | End-to-end Speech Language Model Lite near-field | Realtime WebSocket transcription |
| `audio-mini-realtime-far` | End-to-end Speech Language Model Lite far-field | Realtime WebSocket transcription |
| `audio-realtime-near` | End-to-end Speech Language Model Pro near-field | Realtime WebSocket transcription |
| `audio-realtime-far` | End-to-end Speech Language Model Pro far-field | Realtime WebSocket transcription |
| `1537` | Mandarin near-field recognition model | Short speech `dev_pid` |
| `1737` | English model | Short speech `dev_pid` |
| `1637` | Cantonese model | Short speech `dev_pid` |
| `1837` | Sichuan dialect model | Short speech `dev_pid` |
| `8953` | Speaker separation model | File transcription `pid` |
| `80006` | Chinese audio/video caption model | File transcription `pid` |
| `80001` | Chinese near-field recognition speed model | File transcription `pid` |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Qianfan auth can involve key/secret or access-token management depending on
  the selected API path.
- Friday does not save or pass reasoning effort for Baidu.

Example:

```json
{
	"message": "Classify these support tickets and produce a short summary.",
	"providerId": "baidu",
	"model": "ernie-5.1"
}
```

## Related Docs

- [Provider catalog](index.md)
