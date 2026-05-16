# Channels

Channels are plugin-owned messaging adapters. Core code registers a `ChannelPlugin`, applies its generic config/security/threading adapters, and delegates platform transport to the channel runtime.

The channel catalog in `catalog.ts` lists the OpenClaw-style provider inventory and aliases without importing provider runtimes. Catalog-only plugins are registered for providers that do not yet have bundled transports, so setup and discovery surfaces can reason about stable ids before a runtime exists.

## Current Plugin

Telegram is declared by `telegram/openclaw.plugin.json` and implemented by `telegram/plugin.ts`.

Required credential:

- `TELEGRAM_BOT_TOKEN`, or the saved Telegram token in channel settings.

Saved Telegram config:

- `token`: Telegram bot token.
- `allowFrom`: optional list of Telegram sender IDs. When empty, any sender accepted by the bot transport can message the agent.
- `accounts`: optional named Telegram account configs. Legacy single-account config is treated as the `default` account.
- `dmPolicy`: `allowlist`, `pairing`, `open`, or `deny`. The default is `allowlist`; public DM access requires explicitly setting `open`.

## Inbound Behavior

Telegram polling receives text events in `telegram/adapter.ts`, drops duplicate platform message IDs with an idempotency key, and emits a generic `ChannelInboundMessage`.

`ChannelRegistry` then:

- Resolves the plugin account from channel config.
- Lets the plugin normalize inbound platform facts.
- Resolves structured ingress admission before agent dispatch.
- Builds a stable session key from channel/account/chat/thread identifiers.
- Sends the agent reply back to the resolved Telegram chat/thread target.

Slash commands are ignored by the Telegram receive handler before dispatch.

## Outbound Behavior

Telegram outbound sends use `sendTelegramDurable()` in `telegram/send.ts`. Long text is split into Telegram-sized parts, each platform response is captured as a delivery part, and the result is returned as a `ChannelMessageReceipt` with `sent`, `partial`, or `failed` status.

## Diagnostics

The Telegram plugin doctor reports:

- Missing bot token as an error.
- Empty allowlist as a warning.

Runtime status still flows through the existing status event cache and IPC broadcast path.
