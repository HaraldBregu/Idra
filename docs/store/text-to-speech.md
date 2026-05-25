# Store — Text To Speech

The `textToSpeech` root stores the active text-to-speech provider and model selection.

## Root

| Root | Owns |
| --- | --- |
| `textToSpeech` | Provider id, model id, reasoning effort, and text-to-speech module options. |

## Initial Value

Missing `textToSpeech` means no text-to-speech model has been selected.

## Shape

```json
{
  "providerId": "elevenlabs",
  "modelId": "eleven_multilingual_v2",
  "options": {}
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `providerId` | string | Configured provider id. |
| `modelId` | string | Provider text-to-speech model id. |
| `effort` | string | Optional reasoning effort when supported. |
| `options` | object | Module-specific options. |

## Normalization

`providerId` is trimmed and lower-cased. `modelId` is trimmed. Invalid or missing provider/model pairs are ignored on reads. Writes reject models that are not allowed for the selected provider.

## Related Docs

- [Store](index.md)
- [Providers](../providers/index.md)
