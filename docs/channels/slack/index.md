# Slack Channel

Catalog metadata for Friday's Slack channel.

| Field | Value |
| --- | --- |
| Channel id | `slack` |
| Label | Slack |
| Aliases | none |
| Runtime | Catalog-only |

Slack can be configured in Settings, but Friday does not currently bundle a
Slack runtime adapter.

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

- Slack adapters should use a Slack app with bot OAuth scopes and either Events
  API over HTTPS or Socket Mode for inbound events.
- Event subscriptions are scope-backed, and Slack only sends events visible to
  the installing user or bot.
- Outbound sends use `chat.postMessage`; keep `channel`, `ts`, and `thread_ts`
  in normalized ids so replies remain threaded.
- Slack recommends keeping the `text` field under 4,000 characters and may
  truncate very long messages, so long Friday replies should be split or
  uploaded through a more suitable Slack surface.

## Official Documentation

- [Slack API docs](https://docs.slack.dev/apis/)
- [Slack app manifests](https://docs.slack.dev/app-manifests/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
