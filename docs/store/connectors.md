# Store — Connectors

The dedicated Electron Store named `connector` stores connector configuration records for external systems.

## Property

| Property | Type | Owns |
| --- | --- | --- |
| `connectors` | `ConnectorConfig[]` | Connector ids, labels, MCP transport config, approval policy, discovered tool metadata, and timestamps. |

## Initial Value

Missing `connectors` is read as an empty connector list.

```json
[]
```

## Shape

The property is an array of connector records. Multiple records may use the same provider/catalog id because each record represents one MCP server configuration.

Each value is a connector config with fields such as `id`, `name`, `connectorId`, `serverLabel`, `enabled`, `mcp`, `requireApproval`, `allowedTools`, `deferLoading`, `tools`, timestamps, and `lastError`.

Secrets are not stored as values. HTTP bearer/API-key auth stores an env var reference under `mcp.auth.env`; stdio server secrets map source env vars to target env vars under `mcp.envSecrets`.

## Related Docs

- [Store](index.md)
- [Connectors](../features/connectors.md)
