# ChannelsApi Preload Prompt

Expose channel configuration and lifecycle operations through `window.channels`. This API is the renderer-safe bridge to channel services; it must not expose channel service instances, bot clients, secrets, transport adapters, or raw channel runtime objects.

## Expose

- List the channel catalog.
- Read the full channel configuration.
- Read configuration for one channel type.
- Save configuration for one channel type.
- Read current channel status, optionally filtered by channel type.
- Read Telegram configuration.
- Save Telegram configuration.
- Read Telegram runtime status.
- Start Telegram.
- Stop Telegram.
- Restart Telegram.
- Subscribe to channel status changes.

## Dependencies

- Shared channel catalog, configuration, type, status, and Telegram configuration types.
- Typed channel invoke contracts for configuration, status, and lifecycle commands.
- Typed channel event contracts for status changes.
- A main-process handler that delegates to channel services.
- Main-process ownership of channel secrets, adapters, runtime clients, and status broadcasting.

## Rules

- Use invoke-style calls for channel commands and queries.
- Use subscription-style calls for status changes.
- Return unsubscribe functions from status subscriptions.
- Keep channel secrets and transport clients in the main process.
- Keep channel validation, lifecycle behavior, and provider-specific startup logic outside preload.
- Do not expose raw bot, socket, session, or account runtime objects to the renderer.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run channel service or IPC tests when configuration or lifecycle behavior changes.
- Run renderer checks when renderer consumers change.
