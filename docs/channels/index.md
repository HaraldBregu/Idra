# Channels

The channels module is Friday's external messaging gateway. It keeps a shared
catalog of supported channel identities, stores channel and account
configuration, starts runtime adapters, applies inbound admission rules, sends
allowed messages into the agent, and routes replies back through the same
channel.

## Current Runtime Support

Telegram is the only bundled runtime channel. The remaining catalog entries are
configuration-ready but runtime-disabled until an adapter exists.

Catalog-only channels currently include ClickClack, Discord, Feishu, Google
Chat, iMessage, IRC, LINE, Matrix, Mattermost, Microsoft Teams, Nextcloud Talk,
Nostr, QQ Bot, Signal, Slack, Synology Chat, Tlon, Twitch, WhatsApp, Zalo, and
Zalo Personal. The QA channel is hidden and reserved for tests.

Catalog-only channels can appear in settings, keep stable ids and aliases, and
store account data, but they cannot receive or send because they have no active
runtime factory.

## Configuration

Every channel has an enabled flag, a default account id, and optional account
records. Account records can hold a label, enabled state, credentials, allow
lists, group allow lists, default targets, direct-message policy, and heartbeat
visibility preferences.

All channels default to disabled with a default account id of `default`.
Direct messages use an allowlist policy unless the user changes the policy.
With an empty allowlist, direct messages are denied.

Credential fields such as tokens, secrets, client secrets, webhook URLs, and
authorization values belong only in channel configuration. They should not be
copied into task input, schedule payloads, logs, diagnostics, or agent-visible
messages.

## Registry Lifecycle

At startup, the registry registers catalog-only plugins for every catalog id,
then replaces Telegram with its runtime plugin and registers a lazy Telegram
adapter factory.

Starting a channel follows this flow:

1. Normalize the requested channel id and aliases.
2. Validate and store the channel configuration.
3. Resolve the plugin and default account.
4. Skip startup when the account is disabled, unconfigured, or catalog-only.
5. Create the runtime adapter when a factory exists.
6. Subscribe to adapter status and inbound message events.
7. Start the adapter and cache its runtime status.

Stopping a channel stops the active adapter and removes it from the registry.
Restarting is a stop followed by a start with the current or supplied config.

## Inbound Flow

Runtime adapters receive platform events and convert them into the shared
inbound message shape. The registry then runs one channel turn:

1. Resolve the channel account from saved config.
2. Normalize the provider message into a common inbound message.
3. Apply channel security and admission policy.
4. Record safe diagnostics for accepted messages.
5. Dispatch allowed text to the agent.
6. Resolve the reply target.
7. Send the agent reply through the active channel adapter.

Admission outcomes are:

- `dispatch`: send the message to the agent.
- `handled`: accept the message at the channel layer without dispatching.
- `observeOnly`: observe but do not dispatch.
- `drop`: reject before agent dispatch.

Diagnostics intentionally keep to channel id, account id, chat type, and reason.
They do not copy raw sender ids or private route ids.

## Outbound Flow

Outbound sends require a running adapter for the target channel. Catalog-only
channels reject sends because no adapter is active.

Adapters return durable receipts with a status of `sent`, `partial`, or
`failed`, along with delivered platform message ids, thread information, reply
information, timestamps, and a safe error message when delivery fails.

## Telegram Runtime

Telegram uses long polling and drops pending updates when polling starts. It
emits connection status changes, performs periodic health checks, and
reconnects with exponential backoff after polling or health failures.

Inbound Telegram behavior:

- Receives plain text messages.
- Ignores slash commands before agent dispatch.
- Deduplicates messages by Telegram-derived idempotency key.
- Infers direct, group, channel, or thread chat type.
- Builds session routing from account id, chat id, and optional thread id.
- Preserves provider facts in provenance.

Outbound Telegram behavior:

- Sends replies to the original chat.
- Preserves thread and reply-to ids when available.
- Splits long text into Telegram-sized chunks.
- Returns durable receipts for full, partial, or failed delivery.

Telegram explicit targets use this shape:

```text
telegram:<chatId>
telegram:<accountId>/<chatId>
telegram:<accountId>/<chatId>#<threadId>
```

Negative Telegram ids usually represent groups or supergroups. Thread ids map
to Telegram forum topic message thread ids.

## Renderer Access

The renderer can read the catalog, read and save channel config, read runtime
status, subscribe to status updates, and use Telegram compatibility helpers for
start, stop, restart, status, and config.

Generic runtime controls exist in the registry for host code and tests, but the
renderer currently exposes runtime controls only for Telegram.
