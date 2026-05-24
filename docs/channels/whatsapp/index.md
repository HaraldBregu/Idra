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

## Platform Integration Notes

- The official Meta path is WhatsApp Cloud API with a WhatsApp Business account,
  phone number id, access token, and webhook subscription.
- Web or device-session automation is a different, non-official integration
  path and should not be documented as Cloud API behavior.
- Inbound delivery comes through Meta webhooks and should be verified before
  dispatch. Preserve `wamid`, phone number id, contact `wa_id`, message type,
  and status callbacks in provenance.
- Free-form outbound messaging is constrained by WhatsApp conversation rules;
  adapters may need template sends for business-initiated messages.

## Official Documentation

- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Cloud API get started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
