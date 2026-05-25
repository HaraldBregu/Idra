# Store — Agents

The `agents` root stores configured agents and route bindings for channel or peer-specific agent selection.

## Root

| Root | Owns |
| --- | --- |
| `agents` | Agent definitions, route bindings, workspace overrides, tool policy, and subagent settings. |

## Initial Value

Missing `agents` is read as empty routing settings.

```json
{
  "agents": [],
  "bindings": []
}
```

## Shape

```json
{
  "agents": [
    {
      "id": "default",
      "default": true,
      "workspace": "/workspace",
      "model": {
        "providerId": "openai",
        "modelId": "gpt-4.1"
      }
    }
  ],
  "bindings": [
    {
      "agentId": "default",
      "match": {
        "channel": "telegram"
      },
      "session": {
        "scope": "per-channel-peer"
      }
    }
  ]
}
```

## Properties

Agent entries support `id`, `default`, `name`, `workspace`, `model`, `skills`, `tools`, and `subagents`. Route bindings match an `agentId` to channel, account, peer, parent peer, or role criteria.

Valid session scopes are `main`, `per-peer`, `per-channel-peer`, and `per-account-channel-peer`.

## Normalization

Invalid agent entries and route bindings are dropped. Id fields are trimmed. Provider ids and channel ids are lower-cased. String lists keep unique non-empty values.

## Related Docs

- [Store](index.md)
- [Agent](../agent/index.md)
- [Agents And Subagents](../features/agents-and-subagents.md)
