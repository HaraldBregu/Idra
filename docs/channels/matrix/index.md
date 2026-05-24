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
[Channel subsystem](../index.md#unified-gateway-contract). Provider runtimes must
convert message-in events to `ChannelInboundMessage`, accept message-out
requests as `ChannelOutboundMessage`, and return `ChannelMessageReceipt`
delivery results. Provider-specific ids, thread metadata, and raw payload facts
should stay in normalized fields and `provenance`; the agent must not receive
provider-specific message shapes or be called directly by the runtime.

Catalog-only status should remain until that gateway contract is implemented.

## Platform Integration Notes

- Matrix adapters can be implemented as a normal Client-Server API bot or as an
  Application Service configured on the homeserver.
- Client bots need a homeserver URL, access token, device identity, room joins,
  `/sync` handling, and event send support.
- Application Services are passive observers that can inject events into rooms
  they participate in; they require homeserver registration before use.
- Preserve room id, event id, sender MXID, thread/relation data, and encryption
  state in provenance. End-to-end encrypted rooms require a real Matrix crypto
  implementation before message text can be normalized.

## Official Documentation

- [Matrix specification](https://spec.matrix.org/latest/)
- [Client-server API](https://spec.matrix.org/latest/client-server-api/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
