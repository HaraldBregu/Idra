# Telegram Channel

Catalog metadata for Friday's Telegram channel.

| Field | Value |
| --- | --- |
| Channel id | `telegram` |
| Label | Telegram |
| Aliases | none |
| Runtime | Bundled runtime |

Telegram has a bundled runtime adapter implemented with `grammy`.

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

Telegram target strings can be explicit:

```text
telegram:<chatId>
telegram:<accountId>/<chatId>
telegram:<accountId>/<chatId>#<threadId>
```

Negative Telegram ids generally represent groups or supergroups. Thread ids map
to Telegram forum topic message thread ids.

## Platform Documentation

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [grammY documentation](https://grammy.dev/)

## Related Docs

- [Channel subsystem](index.md)
