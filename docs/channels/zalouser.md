# Zalo Personal Channel

Catalog metadata for Friday's Zalo Personal channel.

| Field | Value |
| --- | --- |
| Channel id | `zalouser` |
| Label | Zalo Personal |
| Aliases | `zlu` |
| Runtime | Catalog-only |

Zalo Personal can be configured in Settings, but Friday does not currently
bundle a Zalo Personal runtime adapter.

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

No verified official personal-user automation API docs found. Reuse official
Zalo developer docs only for supported Official Account flows.

- [Zalo Official Account API](https://developers.zalo.me/docs/api/official-account-api-147)

## Related Docs

- [Channel subsystem](index.md)
- [Unified gateway contract](index.md#unified-gateway-contract)
