# IRC Channel

Catalog metadata for Friday's IRC channel.

| Field | Value |
| --- | --- |
| Channel id | `irc` |
| Label | IRC |
| Aliases | `internet-relay-chat` |
| Runtime | Catalog-only |

IRC can be configured in Settings, but Friday does not currently bundle an IRC
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

- IRC adapters are long-running TCP/TLS clients that register a nick, join
  channels, and receive line-oriented events from the server.
- Use `PRIVMSG` for direct and channel messages; map channel names to group
  targets and nick/userhost prefixes to sender ids.
- SASL is the modern authentication path when the IRC network supports IRCv3
  capabilities.
- IRC does not guarantee durable message ids, so an adapter should construct
  conservative idempotency keys from server, target, sender, command tags, and
  receive time.

## Configuration Reference

- `serverUrl`: IRC or IRC-over-TLS server URL, including host and port.
- `username`: nick, or SASL account name when SASL is enabled.
- `token`: server password, NickServ password, or SASL password.
- `secret`: optional TLS client secret or secondary service password.
- `defaultTarget`: channel name such as `#ops` or a nick for direct messages.
- `allowFrom`: allowed nicks, account names, or userhost masks.
- `groupAllowFrom`: allowed IRC channel names.

Required platform setup:

- Configure TLS and SASL when the network supports them; avoid plaintext
  passwords on non-TLS connections.
- Join configured channels after registration and handle nick collisions.
- Use IRCv3 message tags such as `msgid`, `account`, and `time` when available
  to improve provenance and idempotency.

## Official Documentation

- [IRCv3 specifications](https://ircv3.net/irc/)
- [Modern IRC specification](https://modern.ircdocs.horse/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
