# Store — Speech To Text

The `speechToText` root stores the active speech-to-text provider and model selection.

## Root

| Root | Owns |
| --- | --- |
| `speechToText` | Provider id, model id, reasoning effort, and speech-to-text module options. |

## Initial Value

Missing `speechToText` means no speech-to-text model has been selected.

## Shape

```json
{
  "providerId": "openai",
  "modelId": "whisper-1",
  "options": {}
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `providerId` | string | Configured provider id. |
| `modelId` | string | Provider speech-to-text model id. |
| `effort` | string | Optional reasoning effort when supported. |
| `options` | object | Module-specific options. |

## Normalization

`providerId` is trimmed and lower-cased. `modelId` is trimmed. Invalid or missing provider/model pairs are ignored on reads. Writes reject models that are not allowed for the selected provider.

## Related Docs

- [Store](index.md)
- [OpenAI STT](../providers/openai/stt/index.md)
- [ElevenLabs STT](../providers/elevenlabs/stt/index.md)
