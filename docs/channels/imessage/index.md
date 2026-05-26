# iMessage Channel

Catalog metadata for Friday's iMessage channel.

| Field | Value |
| --- | --- |
| Channel id | `imessage` |
| Label | iMessage |
| Aliases | `imsg` |
| Runtime | Catalog-only |

iMessage can be configured in Settings, but Friday does not currently bundle an
iMessage runtime adapter.

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

- Apple does not provide a general public iMessage bot API for personal
  conversations.
- The Messages framework is for iMessage apps and extensions; Messages for
  Business is a separate Apple-approved business channel.
- Any local-device iMessage runtime must be documented as macOS/user-account
  automation and must not be presented as an Apple cloud bot API.
- Preserve local chat handles, thread ids, and device/account provenance while
  avoiding assumptions about cross-device delivery or history availability.

## Configuration Reference

Personal iMessage has no official Apple bot configuration. If a local runtime is
ever added, document it as macOS user-account automation:

- `serverUrl`: local helper endpoint, if a separate helper process is used.
- `username`: local macOS account or Messages account label.
- `secret`: local helper credential, keychain reference, or automation secret.
- `defaultTarget`: local chat handle or conversation identifier.
- `allowFrom`: allowed local handles for one-to-one conversations.
- `groupAllowFrom`: allowed local chat or group identifiers.

For Apple Messages for Business, use a separate business runtime model:

- `appId`: Apple Messages for Business account or business id.
- `clientId`: Messaging Service Provider account id, when provided.
- `clientSecret`: MSP OAuth client secret, if the MSP requires OAuth.
- `webhookUrl`: callback URL configured with the MSP.

Do not mix personal iMessage automation and Messages for Business credentials in
one account config.

## Official Documentation

- [Apple Messages framework](https://developer.apple.com/documentation/messages)
- [Apple Business Chat / Messages for Business](https://developer.apple.com/business-chat/)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
