# Nostr Channel

Catalog metadata for Friday's Nostr channel.

| Field | Value |
| --- | --- |
| Channel id | `nostr` |
| Label | Nostr |
| Aliases | none |
| Runtime | Catalog-only |

Nostr can be configured in Settings, but Friday does not currently bundle a
Nostr runtime adapter.

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

- Nostr adapters should be relay clients that subscribe to relevant events and
  publish signed outbound events with the configured private key.
- Do not treat NIP-04 as the preferred DM path. NIP-04 is marked
  unrecommended/deprecated in favor of newer private direct-message schemes.
- For private direct messages, track NIP-17/NIP-44/NIP-59 support and preserve
  relay URLs, event ids, pubkeys, tags, and encryption scheme in provenance.
- A runtime must be explicit about key storage, relay allowlists, and metadata
  leakage before enabling direct-message dispatch.

## Configuration Reference

- `serverUrl`: comma-separated relay URLs or a named relay list.
- `secret`: Nostr private key. Store as `nsec` or raw hex only in encrypted
  secret storage.
- `botUserId`: public key (`npub` or hex) derived from the private key.
- `defaultTarget`: recipient public key (`npub` or hex), optionally with relay
  hints.
- `allowFrom`: allowed sender public keys.
- `groupAllowFrom`: allowed relay URLs, NIP-29 group ids, or other selected
  group identifiers if the runtime supports them.

Required platform setup:

- Choose the relay allowlist and private-message scheme before enabling inbound
  dispatch.
- Prefer NIP-17 private direct messages using NIP-44 encryption and NIP-59 gift
  wrapping for new work.
- Treat NIP-04 as legacy compatibility only and label any NIP-04 account as
  metadata-leaking.

## Official Documentation

- [Nostr NIPs](https://github.com/nostr-protocol/nips)
- [NIP-17 private direct messages](https://github.com/nostr-protocol/nips/blob/master/17.md)
- [NIP-44 encryption](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [NIP-04 encrypted direct message, deprecated](https://github.com/nostr-protocol/nips/blob/master/04.md)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
