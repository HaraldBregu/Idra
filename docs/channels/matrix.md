# Matrix Channel

Catalog metadata for Friday's Matrix channel.

| Field | Value |
| --- | --- |
| Channel id | `matrix` |
| Label | Matrix |
| Aliases | none |
| Runtime | Catalog-only |

Matrix can be configured in Settings, but Friday does not currently bundle a
Matrix runtime adapter.

## Implementation Contract

Implement this provider behind Friday's unified channel gateway described in
[Channel subsystem](index.md#unified-gateway-contract). Provider runtimes must
convert message-in events to `ChannelInboundMessage`, accept message-out
requests as `ChannelOutboundMessage`, and return `ChannelMessageReceipt`
delivery results. Provider-specific ids, thread metadata, and raw payload facts
should stay in normalized fields and `provenance`; the agent must not receive
provider-specific message shapes or be called directly by the runtime.

Catalog-only status should remain until that gateway contract is implemented.

## Official Documentation

- [Matrix specification](https://spec.matrix.org/latest/)
- [Client-server API](https://spec.matrix.org/latest/client-server-api/)

## Related Docs

- [Channel subsystem](index.md)
- [Unified gateway contract](index.md#unified-gateway-contract)
