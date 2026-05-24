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
[Channel subsystem](../index.md#unified-gateway-contract). Provider runtimes must
convert message-in events to `ChannelInboundMessage`, accept message-out
requests as `ChannelOutboundMessage`, and return `ChannelMessageReceipt`
delivery results. Provider-specific ids, thread metadata, and raw payload facts
should stay in normalized fields and `provenance`; the agent must not receive
provider-specific message shapes or be called directly by the runtime.

Catalog-only status should remain until that gateway contract is implemented.

## Platform Integration Notes

- This channel represents a personal Zalo user-session concept, not Zalo
  Official Account API.
- Public Zalo developer documentation centers on Official Account APIs, so a
  personal-session runtime must clearly document its transport, login,
  credential storage, and platform risk before it is enabled.
- Do not reuse OA webhook assumptions for personal user sessions unless the
  chosen runtime proves the payload and delivery semantics match.
- Preserve user id, conversation id, device/session id, message id, and login
  provenance so operators can distinguish personal automation from OA traffic.

## Configuration Reference

No verified official personal-user automation API docs were found. If a personal
runtime is selected, document the chosen transport before enabling setup:

- `phoneNumber`: personal Zalo account phone number, if required for login.
- `username`: personal account or device label.
- `serverUrl`: local helper endpoint, if a helper process is used.
- `token`: local helper session token, not an Official Account token.
- `secret`: encrypted session secret, QR-pairing secret, or helper credential.
- `defaultTarget`: personal conversation id in the selected runtime.
- `allowFrom`: allowed personal user ids.
- `groupAllowFrom`: allowed personal group conversation ids.

Do not copy Zalo Official Account token, webhook, or recipient assumptions into
this channel unless the selected personal runtime explicitly matches them.

## Official Documentation

No verified official personal-user automation API docs found. Reuse official
Zalo developer docs only for supported Official Account flows.

- [Zalo Official Account API](https://developers.zalo.me/docs/api/official-account-api-147)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
