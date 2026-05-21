# Nextcloud Talk Channel

Catalog metadata for Friday's Nextcloud Talk channel.

| Field | Value |
| --- | --- |
| Channel id | `nextcloud-talk` |
| Label | Nextcloud Talk |
| Aliases | `nc-talk`, `nc` |
| Runtime | Catalog-only |

Nextcloud Talk can be configured in Settings, but Friday does not currently
bundle a Nextcloud Talk runtime adapter.

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

- [Nextcloud Talk API documentation](https://nextcloud-talk.readthedocs.io/en/latest/)
- [Bots and webhooks](https://nextcloud-talk.readthedocs.io/en/latest/bots/)

## Related Docs

- [Channel subsystem](index.md)
- [Unified gateway contract](index.md#unified-gateway-contract)
