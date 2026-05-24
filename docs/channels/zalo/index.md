# Zalo Channel

Catalog metadata for Friday's Zalo channel.

| Field | Value |
| --- | --- |
| Channel id | `zalo` |
| Label | Zalo |
| Aliases | `zl` |
| Runtime | Catalog-only |

Zalo can be configured in Settings, but Friday does not currently bundle a Zalo
runtime adapter.

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

- The documented business integration path is Zalo Official Account API, using
  an OA access token and webhook events from a linked Official Account.
- Webhook events include user-to-OA message activity such as text, media, and
  delivery/read status events; normalize only user message events into inbound
  agent turns.
- Preserve OA id, user id, message id, event name, and attachment metadata in
  provenance.
- Zalo Personal automation is separate from Official Account API behavior and
  should stay in the `zalouser` channel.

## Official Documentation

- [Zalo Official Account API](https://developers.zalo.me/docs/api/official-account-api-147)
- [Zalo API Explorer](https://developers.zalo.me/tools/explorer/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
