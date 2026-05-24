# Telegram Channel

Catalog metadata for Friday's Telegram channel.

| Field | Value |
| --- | --- |
| Channel id | `telegram` |
| Label | Telegram |
| Aliases | none |
| Runtime | Bundled runtime |

Telegram has a bundled runtime adapter implemented with `grammy`.

## Configuration Notes

Telegram uses the shared channel settings model with a first-class top-level
config shape. The saved token can come from the top-level `token` field or from
the selected account config. `defaultAccountId` falls back to `default`, and the
default account label is `Telegram bot`.

The default direct-message policy is `allowlist`. With an empty `allowFrom`
list, direct messages are denied unless `dmPolicy` is explicitly changed to
`open`. `groupAllowFrom` limits non-DM routes when the list is not empty.

## Implementation Contract

Telegram is Friday's reference implementation of the unified channel gateway
described in [Channel subsystem](../index.md#unified-gateway-contract). Telegram
updates become `ChannelInboundMessage`, agent replies are sent through
`ChannelRegistry.send()` as `ChannelOutboundMessage`, and delivery returns
`ChannelMessageReceipt`.

Current behavior:

- Uses long polling with `drop_pending_updates: true`.
- Emits `connecting`, `connected`, `disconnected`, and `error` status updates.
- Runs a `getMe()` health check every 60 seconds.
- Reconnects with exponential backoff from 2 seconds up to 60 seconds.
- Receives plain text messages only.
- Ignores slash commands before agent dispatch.
- Deduplicates inbound messages by Telegram-derived idempotency key.
- Infers chat type from Telegram chat type and forum topic id.
- Builds session keys as `telegram:<accountId>:<chatId>[:<threadId>]`.
- Sends replies to the original chat, thread, and message id when present.
- Splits outbound text into Telegram's 4096-character message limit.

## Platform Integration Notes

- Telegram bots can receive updates through `getUpdates` long polling or
  webhooks; the two modes are mutually exclusive.
- Friday currently uses long polling, so operational setup must ensure no
  Telegram webhook is configured for the same bot token.
- Webhook mode supports a secret-token header, but that is not used by the
  bundled polling adapter.
- Track Bot API changes before expanding beyond text handling; Telegram's Bot
  API receives frequent updates that add update and message types.

Telegram target strings can be explicit:

```text
telegram:<chatId>
telegram:<accountId>/<chatId>
telegram:<accountId>/<chatId>#<threadId>
```

Negative Telegram ids generally represent groups or supergroups. Thread ids map
to Telegram forum topic message thread ids. Outbound sends currently preserve
plain text and do not set a Telegram parse mode.

## Official Documentation

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [grammY documentation](https://grammy.dev/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
