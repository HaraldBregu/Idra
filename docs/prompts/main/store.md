# Store Module Prompt

Create a store module that is strictly implemented as a reusable service.

The store module owns application persistence. Any module that needs durable application settings should use this service instead of reading or writing Electron Store directly.

The store module has no service dependencies.

## Dependencies

- None. Keep persistence independent from other services.

The store module must use the application logger like the other services.

The store module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the store module isolated:

- Do not import internal store files from outside the store module.
- Do not expose internal store files directly.
- Only `index` exposes the store module.
- Consumers must depend on the exported store service.
- Store behavior must stay centralized inside the store service.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep store-specific implementation types and files inside the store module unless they are genuinely shared.

When changing the store service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

## Store Backend

Use Electron Store with the store name `settings`. Disable dot-notation access so top-level schema keys are handled explicitly.

## Stored Properties

Store these top-level properties:

- `providers`: provider settings.
- `assistant`: assistant model settings.
- `speechToText`: speech-to-text model settings.
- `textToSpeech`: text-to-speech model settings.
- `imageCreator`: image creator model settings.
- `textToVideo`: text-to-video model settings.
- `textToSound`: text-to-sound model settings.
- `agents`: agent routing settings.
- `heartbeat`: heartbeat state.
- `connectors`: connector settings.
- `channels`: channel settings.

## Provider Settings

Store each provider with:

- `id`: provider identifier.
- `name`: provider display name.
- `baseUrl`: provider API base URL.
- `apiKey`: provider API key.

## Model Module Settings

Store `assistant`, `speechToText`, `textToSpeech`, `imageCreator`, `textToVideo`, and `textToSound` with:

- `providerId`: selected provider identifier.
- `modelId`: selected model identifier.
- `effort`: optional model reasoning effort.
- `options`: optional module-specific settings.

## Agents Settings

Store agent routing settings with:

- `agents`: configured agent records.
- `bindings`: agent route bindings.

Each configured agent can store:

- `id`: stable agent identifier.
- `default`: optional default-agent flag.
- `name`: optional display name.
- `workspace`: optional workspace path.
- `model.providerId`: optional provider identifier.
- `model.modelId`: optional model identifier.
- `model.effort`: optional model reasoning effort.
- `skills`: optional enabled skill identifiers.
- `tools`: optional agent tool policy.
- `subagents`: optional subagent configuration.

Each route binding can store:

- `agentId`: routed agent identifier.
- `match`: channel, account, peer, parent peer, or role matching rules.
- `session.scope`: optional route session scope.

## Heartbeat Settings

Store heartbeat state under `heartbeat`. Normalize heartbeat state before returning or writing it.

## Connector Settings

Store connector settings by connector key:

- `google_gmail`
- `google_calendar`
- `google_drive`
- `microsoft_teams`
- `outlook_calendar`
- `outlook_email`
- `sharepoint`
- `dropbox`

## Channel Settings

Store channel settings under `channels`. Channel settings can include channel defaults and per-channel configuration for supported channel providers.

Common channel account properties can include:

- `label`
- `enabled`
- `token`
- `secret`
- `serverUrl`
- `webhookUrl`
- `appId`
- `clientId`
- `clientSecret`
- `username`
- `phoneNumber`
- `botUserId`
- `defaultTarget`
- `allowFrom`
- `groupAllowFrom`
- `dmPolicy`
- `heartbeat`

## Logging

Use the application's logger for all operational reporting, including reads, writes, validation failures, migrations, normalization failures, and persistence errors. Do not use console logging for module behavior.

## Implementation Requirements

When implementing or changing this module:

- Respect the declared dependencies. Do not add service dependencies unless the existing project requirements explicitly require it.
- Refactor the owning service directly instead of layering patch-style fixes. Keep public behavior centralized in the service.
- Put types, constants, schemas, channels, or helper files under `src/shared` when they are used across the main process, preload, renderer, or multiple services. Keep module-only files inside the module.
- Implement or update tests for the behavior being changed, including failure paths and dependency interactions.
- Verify the implementation with the narrowest relevant typecheck, lint, test, or docs check before finishing.
- Delete files, functions, imports, exports, tests, and local types made unused by the change.

## Testing

Test provider storage, model module storage, cron settings, task settings, agent routing settings, heartbeat state, connector settings, channel settings, normalization, invalid stored data, and persistence errors. Tests should call the exported store service and should not import internal store files directly.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
