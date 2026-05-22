# WhatsApp Channel

Catalog metadata for Friday's WhatsApp channel.

| Field | Value |
| --- | --- |
| Channel id | `whatsapp` |
| Label | WhatsApp |
| Aliases | none |
| Runtime | Catalog-only |

WhatsApp can be configured in Settings, but Friday does not currently bundle a
WhatsApp runtime adapter.

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

- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Cloud API get started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
