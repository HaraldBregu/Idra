# iMessage Channel

Catalog metadata for Friday's iMessage channel.

| Field | Value |
| --- | --- |
| Channel id | `imessage` |
| Label | iMessage |
| Aliases | `imsg` |
| Runtime | Catalog-only |

iMessage can be configured in Settings, but Friday does not currently bundle an
iMessage runtime adapter.

## Implementation Contract

Implement this provider behind Friday's unified channel gateway described in
[Channel subsystem](../index.md#unified-gateway-contract). Provider runtimes must
convert message-in events to `ChannelInboundMessage`, accept message-out
requests as `ChannelOutboundMessage`, and return `ChannelMessageReceipt`
delivery results. Provider-specific ids, thread metadata, and raw payload facts
should stay in normalized fields and `provenance`; the agent must not receive
provider-specific message shapes or be called directly by the runtime.

Catalog-only status should remain until that gateway contract is implemented.

## Official Documentation

- [Apple Messages framework](https://developer.apple.com/documentation/messages)
- [Apple Business Chat / Messages for Business](https://developer.apple.com/business-chat/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
