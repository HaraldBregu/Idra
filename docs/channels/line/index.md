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

## Configuration Reference

- `token`: LINE channel access token used as the Messaging API bearer token.
- `secret`: LINE channel secret used for `x-line-signature` verification.
- `appId`: LINE channel id.
- `botUserId`: LINE Bot Basic ID.
- `webhookUrl`: HTTPS webhook URL configured in the LINE Developers Console.
- `defaultTarget`: LINE user id, group id, or room id for push messages.
- `allowFrom`: allowed LINE user ids.
- `groupAllowFrom`: allowed LINE group or room ids.

Required platform setup:

- Create a LINE Official Account and Messaging API channel.
- Issue a channel access token, enable webhooks, and register Friday's HTTPS
  callback URL.
- Verify every inbound webhook signature against the raw request body before
  normalizing events.

## Official Documentation

- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Messaging API reference](https://developers.line.biz/en/reference/messaging-api/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
