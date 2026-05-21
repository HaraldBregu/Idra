# Channels

This document describes Friday's messaging channel subsystem: the catalog shown
in Settings, the shared channel configuration model, the main-process registry,
and the currently bundled Telegram runtime.

## Catalog

Friday should maintain a channel catalog with stable channel ids, labels,
aliases, UI ordering, markdown support, exposure, and docs paths. Aliases such
as `lark`, `gchat`, `google-chat`, `imsg`, `teams`, `nc`, `twitch-chat`, `zl`,
and `zlu` should resolve to their canonical ids.

Only `telegram` has a bundled runtime. All other entries are catalog-only
plugins with disabled runtime capabilities. Catalog-only channels can still be
configured in Settings so the UI, stored config, future runtime work, and docs
all share stable ids.

| Channel id | Label | Aliases | Runtime | Official/platform documentation |
| --- | --- | --- | --- | --- |
| `clickclack` | ClickClack | none | Catalog-only | No verified vendor-official public API docs found. Existing external channel docs: [OpenClaw ClickClack plugin](https://docs.openclaw.ai/plugins/reference/clickclack). |
| `discord` | Discord | none | Catalog-only | [Discord Developer Platform](https://docs.discord.com/developers/intro), [Discord Bots](https://docs.discord.com/developers/bots). |
| `feishu` | Feishu | `lark` | Catalog-only | [Feishu Open Platform](https://open.feishu.cn/document/home/index), [Lark Developer](https://open.larksuite.com/document/home/index). |
| `googlechat` | Google Chat | `gchat`, `google-chat` | Catalog-only | [Google Chat developer docs](https://developers.google.com/workspace/chat), [Google Chat API reference](https://developers.google.com/workspace/chat/api/reference/rest). |
| `imessage` | iMessage | `imsg` | Catalog-only | [Apple Messages framework](https://developer.apple.com/documentation/messages), [Apple Business Chat / Messages for Business](https://developer.apple.com/business-chat/). |
| `irc` | IRC | `internet-relay-chat` | Catalog-only | [IRCv3 specifications](https://ircv3.net/irc/), [Modern IRC specification](https://modern.ircdocs.horse/). |
| `line` | LINE | none | Catalog-only | [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/), [LINE Messaging API reference](https://developers.line.biz/en/reference/messaging-api/). |
| `matrix` | Matrix | none | Catalog-only | [Matrix specification](https://spec.matrix.org/latest/), [Client-server API](https://spec.matrix.org/latest/client-server-api/). |
| `mattermost` | Mattermost | none | Catalog-only | [Mattermost developer docs](https://developers.mattermost.com/), [Mattermost integration reference](https://developers.mattermost.com/integrate/reference/). |
| `msteams` | Microsoft Teams | `teams` | Catalog-only | [Microsoft Teams developer platform](https://learn.microsoft.com/en-us/microsoftteams/platform/overview), [Teams Graph API overview](https://learn.microsoft.com/en-us/graph/teams-concept-overview). |
| `nextcloud-talk` | Nextcloud Talk | `nc-talk`, `nc` | Catalog-only | [Nextcloud Talk API documentation](https://nextcloud-talk.readthedocs.io/en/latest/), [Bots and webhooks](https://nextcloud-talk.readthedocs.io/en/latest/bots/). |
| `nostr` | Nostr | none | Catalog-only | [Nostr NIPs](https://github.com/nostr-protocol/nips), [NIP-04 encrypted direct message](https://github.com/nostr-protocol/nips/blob/master/04.md). |
| `qa-channel` | QA Channel | none | Hidden catalog-only | Internal synthetic test channel. There is no external official documentation. |
| `qqbot` | QQ Bot | none | Catalog-only | [QQ Bot official docs](https://bot.q.qq.com/wiki/). |
| `signal` | Signal | none | Catalog-only | Signal does not publish an official bot API for this use case. Official user/device docs: [Signal linked devices](https://support.signal.org/hc/en-us/articles/360007320551-Linked-Devices). |
| `slack` | Slack | none | Catalog-only | [Slack API docs](https://docs.slack.dev/apis/), [Slack app manifests](https://docs.slack.dev/app-manifests/). |
| `synology-chat` | Synology Chat | none | Catalog-only | [Synology Chat technical specs](https://www.synology.com/en-global/dsm/7.2/software_spec/chat), [Using Integration in Synology Chat](https://kb.synology.com/en-global/DSM/help/Chat/chat_integration). |
| `telegram` | Telegram | none | Bundled runtime | [Telegram Bot API](https://core.telegram.org/bots/api), [grammY documentation](https://grammy.dev/). |
| `tlon` | Tlon | none | Catalog-only | [Tlon developer docs](https://dev.tlon.io/), [Urbit developer docs](https://docs.urbit.org/). |
| `twitch` | Twitch | `twitch-chat` | Catalog-only | [Twitch Chat and Chatbots](https://dev.twitch.tv/docs/chat/), [Twitch API reference](https://dev.twitch.tv/docs/api/). |
| `whatsapp` | WhatsApp | none | Catalog-only | [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api), [Cloud API get started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started). |
| `zalo` | Zalo | `zl` | Catalog-only | [Zalo Official Account API](https://developers.zalo.me/docs/api/official-account-api-147), [Zalo API Explorer](https://developers.zalo.me/tools/explorer/). |
| `zalouser` | Zalo Personal | `zlu` | Catalog-only | No verified official personal-user automation API docs found. Reuse official Zalo developer docs only for supported Official Account flows: [Zalo Official Account API](https://developers.zalo.me/docs/api/official-account-api-147). |

## Configuration Model

The stored channel state is a `Channel` object keyed by `ChannelType`. Each
channel has an `enabled` flag, a `defaultAccountId`, and optional `accounts`.
Account config uses `ChannelAccountProperties`:

- `label`
- `enabled`
- `token`, `secret`, `clientSecret`
- `serverUrl`, `webhookUrl`
- `appId`, `clientId`, `username`, `phoneNumber`, `botUserId`
- `allowFrom`
- `groupAllowFrom`
- `defaultTarget`
- `dmPolicy`
- `heartbeat`

`StoreService` creates default channel config for every catalog id. Telegram,
WhatsApp, and Discord have first-class top-level config shapes because they need
common token, allowlist, and account fields. Other channels use the generic
account map.

All channels default to disabled. The default direct-message policy is
`allowlist`, so an empty `allowFrom` list denies direct messages unless a user
explicitly changes `dmPolicy` to `open`.

Treat all token, secret, webhook, and client credential fields as secrets. Do
not log them, add them to docs examples as real values, commit them, or include
them in agent-visible output. The Telegram plugin also advertises
`TELEGRAM_BOT_TOKEN` and secret assignment paths for future secret-store work.

## Renderer IPC API

The preload layer exposes `window.channels`:

| Method | IPC channel | Purpose |
| --- | --- | --- |
| `listCatalog()` | `channels:catalog` | Return the shared catalog entries. |
| `getConfig()` | `channels:get-config` | Return the full stored channel config. |
| `getChannelConfig(type)` | `channels:get-channel-config` | Return one channel config by id. |
| `saveChannelConfig(type, config)` | `channels:save-channel-config` | Normalize and persist one channel config. Telegram saves also reconfigure the registry. |
| `getStatus(type?)` | `channels:get-status` | Return cached runtime status. Defaults to Telegram when omitted. |
| `getTelegramConfig()` | `channels:telegram:get-config` | Compatibility helper for Telegram config. |
| `saveTelegramConfig(config)` | `channels:telegram:save-config` | Compatibility helper that normalizes and persists Telegram config. |
| `getTelegramStatus()` | `channels:telegram:get-status` | Compatibility helper for Telegram status. |
| `startTelegram()` | `channels:telegram:start` | Save current config and start Telegram polling. |
| `stopTelegram()` | `channels:telegram:stop` | Stop Telegram polling. |
| `restartTelegram()` | `channels:telegram:restart` | Stop and start Telegram polling with current config. |
| `onStatusChanged(callback)` | `channels:status-changed` | Subscribe to runtime status broadcasts. |

`ChannelsIpc` validates channel ids with `normalizeChannelId()` before reading
or writing config. Unsupported ids throw an IPC error.

## Registry And Plugin Lifecycle

`ChannelRegistry` owns registered plugins, runtime factories, active adapters,
channel configs, and the status cache.

Startup behavior:

1. Register catalog-only plugins for every catalog entry.
2. Register the Telegram runtime plugin, overriding the catalog-only Telegram
   entry.
3. Register the lazy Telegram runtime factory.
4. Register any injected runtime factories from tests or future host code.

Runtime start behavior:

1. Resolve and validate the canonical channel id.
2. Persist or reuse the channel config.
3. Resolve the plugin and default account.
4. Skip start if the account is disabled, unconfigured, or the channel has no
   runtime factory.
5. Create the adapter, subscribe to adapter status and message events, and call
   `adapter.start()`.

Status events are cached, emitted on the main event bus as `channel:status`,
and broadcast to the renderer as `channels:status-changed`.

## Inbound Flow

For runtime channels, inbound messages follow this path:

1. The platform adapter receives a platform event and emits a
   `ChannelInboundMessage`.
2. `ChannelRegistry.handleMessage()` resolves the plugin, account id, and saved
   config.
3. `runChannelTurn()` resolves the configured account.
4. The plugin normalizes the raw message to a
   `ChannelNormalizedInboundMessage`.
5. `resolveIngressAdmission()` evaluates the plugin security adapter.
6. Allowed messages are recorded and dispatched to `AgentService.send()`.
7. The registry resolves the reply target and sends the agent reply through the
   channel adapter.

Admission outcomes:

- `dispatch`: send to the agent.
- `handled`: accepted by the channel layer but not dispatched, for example a
  pairing-required direct message.
- `observeOnly`: observed but not dispatched, for example a mention miss.
- `drop`: rejected before agent dispatch.

Ingress diagnostics intentionally include channel, account, chat type, and
reason only. Raw sender ids and route ids are not copied into diagnostics.

## Outbound Flow

Outbound sends use `ChannelOutboundMessage`:

```ts
await channelRegistry.send({
	type: 'telegram',
	accountId: 'default',
	to: '-1001234567890',
	threadId: '42',
	replyToMessageId: '101',
	text: 'Hello from Friday',
	idempotencyKey: 'example:reply',
});
```

The registry requires a running adapter for the target channel. Catalog-only
channels reject sends because they have no active runtime adapter.

Durable send helpers return `ChannelMessageReceipt` with:

- `sent` when every part was delivered.
- `partial` when some parts were delivered before a failure.
- `failed` when nothing was delivered.

## Telegram Runtime

Telegram is implemented with `grammy`.

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

## Adding A Runtime Channel

Use the existing Telegram plugin as the template.

1. Add or verify the id in `CHANNEL_PROVIDER_IDS`.
2. Add catalog metadata in `CHANNEL_CATALOG_INPUT`.
3. Define a shared config shape only if the generic account shape is not
   enough.
4. Implement a `ChannelPlugin` with config, setup, security, messaging,
   threading, and doctor adapters.
5. Implement a runtime `ChannelAdapter` with `start()`, `stop()`, `send()`,
   `onMessage()`, and `onStatus()`.
6. Register the plugin and runtime factory in `ChannelRegistry`.
7. Add IPC helpers only when generic `saveChannelConfig()` and `getStatus()` are
   not enough.
8. Update Settings UI only for fields that need channel-specific controls.
9. Add tests for catalog normalization, config normalization, ingress admission,
   message normalization, durable sends, registry start/stop/send behavior, and
   any target parsing rules.
10. Add official docs links to the catalog table above.

Do not bypass `runChannelTurn()` for inbound agent dispatch. That path keeps
account resolution, security policy, diagnostics, and reply routing consistent
across runtimes.
