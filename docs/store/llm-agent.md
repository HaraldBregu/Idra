# Store — LLM Agent

The `llmAgent` root stores the active chat and agent model selection. It also carries agent-facing module options such as runtime preference and heartbeat defaults.

## Root

| Root | Owns |
| --- | --- |
| `llmAgent` | Provider id, model id, reasoning effort, and agent module options. |

## Initial Value

Missing `llmAgent` means no chat model has been selected.

## Shape

```json
{
  "providerId": "openai",
  "modelId": "gpt-4.1",
  "effort": "medium",
  "options": {
    "agentRuntime": "friday"
  }
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `providerId` | string | Configured provider id. |
| `modelId` | string | Provider model id. |
| `effort` | string | Optional reasoning effort. |
| `options` | object | Module-specific options. |

## Normalization

`providerId` is trimmed and lower-cased. `modelId` is trimmed. Invalid or missing provider/model pairs are ignored on reads. `options.agentRuntime` is trimmed and removed when empty.

## Related Docs

- [Store](index.md)
- [Providers And Models](../features/providers-and-models.md)
- [Agent](../agent/index.md)
