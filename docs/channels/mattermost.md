# Mattermost Channel

Catalog metadata for Friday's Mattermost channel.

| Field | Value |
| --- | --- |
| Channel id | `mattermost` |
| Label | Mattermost |
| Aliases | none |
| Runtime | Catalog-only |

Mattermost can be configured in Settings, but Friday does not currently bundle a
Mattermost runtime adapter.

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

- [Mattermost developer docs](https://developers.mattermost.com/)
- [Mattermost integration reference](https://developers.mattermost.com/integrate/reference/)

## Related Docs

- [Channel subsystem](index.md)
- [Unified gateway contract](index.md#unified-gateway-contract)
