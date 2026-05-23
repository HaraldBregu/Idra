# Channels

Channels let Friday receive messages from external chat systems, run an agent turn, and deliver a response back through the originating channel or another configured target.

## Functionality

- Provides a catalog of supported channel ids, names, aliases, capabilities, and setup fields.
- Stores per-channel account configuration, enabled state, security settings, and secrets.
- Starts runtime adapters only for configured and enabled accounts.
- Normalizes inbound messages before they reach the agent.
- Applies direct-message admission policy before dispatch.
- Sends outbound replies through the channel registry and records delivery status.

## Current Runtime Support

Telegram has a bundled runtime adapter. The bundled catalog also contains entries for clickclack, discord, feishu, googlechat, imessage, irc, line, matrix, mattermost, msteams, nextcloud-talk, nostr, qa-channel, qqbot, signal, slack, synology-chat, tlon, twitch, whatsapp, zalo, and zalouser. Those entries are catalog-only until a runtime adapter is registered for them.

## Catalog, Configuration, And Accounts

Each channel has a stable id, optional aliases, capabilities, setup fields, and account defaults. The default account id is `default`. Accounts are disabled until configured, and direct messages use an allowlist policy by default.

Channel secrets remain inside the channel account records. Public channel status and catalog reads expose readiness and setup metadata without exposing secret values.

## Registry Behavior

The channel registry owns channel plugin registration, account startup, runtime status, inbound dispatch, and outbound delivery. It registers catalog-only plugins first, then overrides entries when a runtime adapter is available.

When an account starts, the registry checks that the channel exists, the account is enabled, required setup fields are present, and a runtime factory is available. The running adapter receives lifecycle callbacks and reports status changes such as connecting, connected, disconnected, or error.

## Inbound Flow

1. The adapter receives an external message and emits a normalized inbound event.
2. The registry resolves the channel, plugin, and account.
3. The plugin normalizes the message into Friday's inbound message shape.
4. Security policy decides whether to dispatch, handle without dispatching, observe only, or drop the message.
5. Dispatchable messages run an agent turn with channel context.
6. The resulting reply is sent through the registry so delivery is handled by the owning adapter.

## Outbound Flow

Outbound channel delivery goes through the registry. A running adapter is required for sends. Delivery attempts return a durable status of sent, partial, or failed with enough detail for the caller to report what happened.

## Telegram Runtime

The Telegram adapter uses long polling, drops pending updates on startup, and keeps a health check loop. Reconnect attempts use exponential backoff with bounded delays.

Telegram inbound handling is text-only. Slash commands are ignored, duplicate updates are deduped, and each message records chat type, chat id, optional thread id, sender information, and a stable session key. Replies are chunked to fit Telegram message limits.

## Renderer Access

The renderer can read the channel catalog, read and update account configuration, inspect account runtime status, and control Telegram accounts through the channel service. Runtime state changes are broadcast so the UI can update without polling every service directly.
