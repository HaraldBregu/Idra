# Google Chat Channel

Catalog metadata for Friday's Google Chat channel.

| Field | Value |
| --- | --- |
| Channel id | `googlechat` |
| Label | Google Chat |
| Aliases | `gchat`, `google-chat` |
| Runtime | Catalog-only |

Google Chat can be configured in Settings, but Friday does not currently bundle
a Google Chat runtime adapter.

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

- [Google Chat developer docs](https://developers.google.com/workspace/chat)
- [Google Chat API reference](https://developers.google.com/workspace/chat/api/reference/rest)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
