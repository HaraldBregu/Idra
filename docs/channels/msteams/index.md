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
[Channel subsystem](../index.md#unified-gateway-contract). Provider runtimes must
convert message-in events to `ChannelInboundMessage`, accept message-out
requests as `ChannelOutboundMessage`, and return `ChannelMessageReceipt`
delivery results. Provider-specific ids, thread metadata, and raw payload facts
should stay in normalized fields and `provenance`; the agent must not receive
provider-specific message shapes or be called directly by the runtime.

Catalog-only status should remain until that gateway contract is implemented.

## Platform Integration Notes

- Microsoft Teams conversational bots are Teams apps backed by a bot service and
  can run in personal, group chat, and channel scopes.
- Use Bot Framework or Teams SDK activity handlers for inbound messages and
  proactive bot sends for replies that happen after the original activity.
- Incoming webhook and Microsoft 365 Connector flows are not equivalent to a
  conversational bot; Microsoft is moving connector scenarios toward Workflows.
- Connector-style posting has strict channel rate limits, so a future adapter
  must back off and surface throttled receipts.

## Configuration Reference

- `appId`: Microsoft App ID / Azure Bot ID.
- `clientId`: Microsoft Entra application client id, usually the same bot app
  id for Bot Framework flows.
- `clientSecret`: Azure Bot app password or client secret.
- `webhookUrl`: public Bot Framework messaging endpoint, normally ending in
  `/api/messages`.
- `defaultTarget`: stored Teams conversation id or channel conversation
  reference, including tenant id when needed.
- `allowFrom`: allowed Teams user ids or Microsoft Entra object ids.
- `groupAllowFrom`: allowed team, channel, or group chat ids.

Required platform setup:

- Register an Azure Bot, configure its messaging endpoint, and package a Teams
  app manifest whose bot id matches the Azure Bot id.
- Include the `personal`, `team`, and/or `groupChat` scopes in the Teams app
  manifest according to the surfaces Friday should support.
- Store conversation references from inbound activities before attempting
  proactive outbound messages.

## Official Documentation

- [Microsoft Teams developer platform](https://learn.microsoft.com/en-us/microsoftteams/platform/overview)
- [Teams Graph API overview](https://learn.microsoft.com/en-us/graph/teams-concept-overview)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
