# Synology Chat Channel

Catalog metadata for Friday's Synology Chat channel.

| Field | Value |
| --- | --- |
| Channel id | `synology-chat` |
| Label | Synology Chat |
| Aliases | none |
| Runtime | Catalog-only |

Synology Chat can be configured in Settings, but Friday does not currently
bundle a Synology Chat runtime adapter.

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

- Synology Chat supports custom integrations with incoming webhooks, outgoing
  webhooks, bots, and slash commands.
- A bidirectional Friday runtime should use the bot/outgoing surfaces for
  inbound dispatch and incoming/bot posting for outbound delivery, depending on
  the target server version.
- Synology documents channels, conversations, threads, reactions, file uploads,
  and encrypted conversations; preserve those ids and encryption state in
  provenance.
- Synology Chat Server limits ChatBots per server, so setup should surface
  server-side capacity errors clearly.

## Official Documentation

- [Synology Chat technical specs](https://www.synology.com/en-global/dsm/7.2/software_spec/chat)
- [Using Integration in Synology Chat](https://kb.synology.com/en-global/DSM/help/Chat/chat_integration)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
