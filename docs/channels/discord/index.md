# Discord Channel

Catalog metadata for Friday's Discord channel.

| Field | Value |
| --- | --- |
| Channel id | `discord` |
| Label | Discord |
| Aliases | none |
| Runtime | Catalog-only |

Discord can be configured in Settings, but Friday does not currently bundle a
Discord runtime adapter.

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

- Discord bot adapters receive message events through the Gateway WebSocket and
  send messages through the HTTP API.
- Gateway identifies must request the message intents needed by the configured
  scope, such as guild messages and direct messages; message content access may
  require the privileged Message Content intent.
- Preserve Discord snowflakes for guild, channel, thread, user, and message ids
  in normalized ids and provenance.
- Outbound replies should use channel/thread targets and record Discord REST
  message ids in `ChannelMessageReceipt`.

## Configuration Reference

- `token`: Discord bot token from the Developer Portal Bot page.
- `appId`: Discord application id.
- `clientId`: OAuth2 client id, normally the same value as `appId`.
- `clientSecret`: OAuth2 client secret, only needed for install or OAuth flows.
- `botUserId`: bot user id returned by Discord after the bot is created.
- `defaultTarget`: Discord channel id or thread id for proactive sends.
- `allowFrom`: allowed Discord user snowflakes for DMs.
- `groupAllowFrom`: allowed guild, channel, or thread snowflakes.

Required platform setup:

- Invite the app with the `bot` scope and channel send/read permissions for the
  target guilds; add `applications.commands` only if slash commands are used.
- Enable and request Gateway intents for guild messages, direct messages, and
  message content when the adapter needs raw message text outside DMs, mentions,
  or messages sent by the bot.
- Keep Discord REST message ids in receipts and Discord Gateway sequence data in
  provenance for reconnect and dedupe behavior.

## Official Documentation

- [Discord Developer Platform](https://docs.discord.com/developers/intro)
- [Discord Bots](https://docs.discord.com/developers/bots)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
