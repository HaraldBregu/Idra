# ClickClack Channel

Catalog metadata for Friday's ClickClack channel.

| Field | Value |
| --- | --- |
| Channel id | `clickclack` |
| Label | ClickClack |
| Aliases | none |
| Runtime | Catalog-only |

ClickClack can be configured in Settings, but Friday does not currently bundle a
ClickClack runtime adapter.

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

- Treat ClickClack as a third-party OpenClaw plugin surface, not a first-party
  public chat API.
- A runtime should document the exact OpenClaw plugin URL, token, and callback
  shape it supports before exposing setup fields.
- Normalize plugin conversation ids, sender ids, and delivery ids into Friday's
  gateway fields so OpenClaw payloads do not leak into agent turns.
- Keep this channel catalog-only until an OpenClaw-compatible runtime exists and
  its event authentication and retry behavior are verified.

## Official Documentation

No verified vendor-official public API docs found.

Existing external channel docs:

- [OpenClaw ClickClack plugin](https://docs.openclaw.ai/plugins/reference/clickclack)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
