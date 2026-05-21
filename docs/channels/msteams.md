# Microsoft Teams Channel

Catalog metadata for Friday's Microsoft Teams channel.

| Field | Value |
| --- | --- |
| Channel id | `msteams` |
| Label | Microsoft Teams |
| Aliases | `teams` |
| Runtime | Catalog-only |

Microsoft Teams can be configured in Settings, but Friday does not currently
bundle a Microsoft Teams runtime adapter.

## Implementation Contract

Implement this provider behind Friday's unified channel gateway described in
[Channel subsystem](index.md#unified-gateway-contract). Provider runtimes must
convert message-in events to `ChannelInboundMessage`, accept message-out
requests as `ChannelOutboundMessage`, and return `ChannelMessageReceipt`
delivery results. Provider-specific ids, thread metadata, and raw payload facts
should stay in normalized fields and `provenance`; the agent must not receive
provider-specific message shapes or be called directly by the runtime.

Catalog-only status should remain until that gateway contract is implemented.

## Official Documentation

- [Microsoft Teams developer platform](https://learn.microsoft.com/en-us/microsoftteams/platform/overview)
- [Teams Graph API overview](https://learn.microsoft.com/en-us/graph/teams-concept-overview)

## Related Docs

- [Channel subsystem](index.md)
- [Unified gateway contract](index.md#unified-gateway-contract)
