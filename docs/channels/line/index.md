# LINE Channel

Catalog metadata for Friday's LINE channel.

| Field | Value |
| --- | --- |
| Channel id | `line` |
| Label | LINE |
| Aliases | none |
| Runtime | Catalog-only |

LINE can be configured in Settings, but Friday does not currently bundle a LINE
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

- LINE Messaging API adapters receive HTTPS webhook events from a LINE Official
  Account and send replies or push messages through the Messaging API.
- Required secrets are the channel access token for API calls and the channel
  secret for webhook signature validation.
- Inbound webhooks include event objects for messages, follows, joins, leaves,
  postbacks, and related account events; only message-like events should become
  `ChannelInboundMessage`.
- Reply-token sends and push sends have different delivery semantics, so record
  which path produced each receipt.

## Official Documentation

- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Messaging API reference](https://developers.line.biz/en/reference/messaging-api/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
