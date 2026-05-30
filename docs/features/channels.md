# Channel Support

Channels let Friday receive messages from external chat systems, run an agent turn, and send a response through the originating channel or another configured delivery target.

## Current Runtime Status

Telegram has a bundled local runtime adapter.

The channel catalog also contains entries for:

- ClickClack
- Discord
- Feishu/Lark
- Google Chat
- iMessage
- IRC
- LINE
- Matrix
- Mattermost
- Microsoft Teams
- Nextcloud Talk
- Nostr
- QQ Bot
- Signal
- Slack
- Synology Chat
- Tlon
- Twitch
- WhatsApp
- Zalo
- Zalo Personal

Those entries are catalog-only until a runtime adapter is registered for the channel. The QA channel is hidden and used for local QA and contract testing.

## Functionality

- Provides a typed catalog of channel ids, labels, aliases, docs paths, visibility, markdown capability, setup hints, and runtime support.
- Stores per-channel account configuration, enabled state, security settings, and secrets.
- Starts runtime adapters only for configured and enabled accounts.
- Normalizes inbound messages before dispatch.
- Applies direct-message admission policy before running the agent.
- Routes channel sessions by channel, account, peer, and thread.
- Sends outbound replies through the channel registry and reports delivery status.
- Exposes catalog, account config, runtime status, and channel controls to the renderer settings UI.

## Telegram Runtime

The Telegram adapter uses long polling, drops pending updates on startup, runs a health check loop, and reconnects with bounded exponential backoff. Telegram inbound handling is text-only. Slash commands are ignored, duplicate updates are deduped, and outgoing replies are chunked to fit Telegram message limits.

## Source

- `src/main/channels`
- `src/main/channels/telegram`
- `src/shared/channels`
- `src/renderer/src/pages/settings/pages/channels`
- Existing docs: `docs/channels/index.md`, `docs/channels/telegram/index.md`

