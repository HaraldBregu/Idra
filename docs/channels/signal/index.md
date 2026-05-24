# Signal Channel

Catalog metadata for Friday's Signal channel.

| Field | Value |
| --- | --- |
| Channel id | `signal` |
| Label | Signal |
| Aliases | none |
| Runtime | Catalog-only |

Signal can be configured in Settings, but Friday does not currently bundle a
Signal runtime adapter.

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

- Signal does not publish a general first-party bot HTTP API.
- A local runtime would need to act as a linked device for a user-controlled
  Signal account and should make that operational model explicit in setup.
- Linked devices are paired by QR/device-link flow and do not automatically mean
  all previous history is available.
- Preserve Signal recipient ids, group ids, timestamps, and local device/account
  provenance. Never imply that Signal message contents are available without
  the linked-device cryptographic state.

## Official Documentation

Signal does not publish an official bot API for this use case.

Official user/device docs:

- [Signal linked devices](https://support.signal.org/hc/en-us/articles/360007320551-Linked-Devices)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
