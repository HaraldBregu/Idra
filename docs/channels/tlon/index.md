# Tlon Channel

Catalog metadata for Friday's Tlon channel.

| Field | Value |
| --- | --- |
| Channel id | `tlon` |
| Label | Tlon |
| Aliases | none |
| Runtime | Catalog-only |

Tlon can be configured in Settings, but Friday does not currently bundle a Tlon
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

- Tlon is built on Urbit, so an adapter should be explicit about whether it
  talks to a local ship, hosted ship, or app-specific HTTP/Eyre endpoint.
- Urbit application development uses ships, desks, Gall agents, and glob or
  docket packaging rather than a conventional SaaS bot webhook model.
- Preserve ship, desk, app, group, channel, and message/event identifiers in
  provenance because those values are needed to route replies.
- Keep setup catalog-only until the exact Tlon/Urbit app API for chat ingress
  and egress is selected and documented.

## Configuration Reference

- `serverUrl`: local or hosted Urbit ship URL.
- `username`: ship name, such as `~zod`.
- `token`: web login code, session token, or runtime-specific bearer token.
- `secret`: local session secret or helper credential, if a helper process is
  used.
- `appId`: selected desk, Gall agent, or Tlon app identifier.
- `defaultTarget`: group, channel, or app-specific conversation id.
- `allowFrom`: allowed ship names.
- `groupAllowFrom`: allowed group or channel identifiers.

Required platform setup:

- Select and document the exact Tlon or Urbit API surface before enabling this
  channel; Urbit ships and desks are not interchangeable with SaaS bot apps.
- Keep auth/session storage explicit because Urbit web sessions and ship access
  are account-level credentials.
- Preserve the ship and app context in every normalized message.

## Official Documentation

- [Tlon developer docs](https://dev.tlon.io/)
- [Urbit developer docs](https://docs.urbit.org/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
