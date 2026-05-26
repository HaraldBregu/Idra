# Google Chat Channel

Catalog metadata for Friday's Google Chat channel.

| Field | Value |
| --- | --- |
| Channel id | `googlechat` |
| Label | Google Chat |
| Aliases | `gchat`, `google-chat` |
| Runtime | Catalog-only |

Google Chat can be configured in Settings, but Friday does not currently bundle
a Google Chat runtime adapter.

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

- Google Chat adapters should model Friday as an interactive Chat app rather
  than a raw webhook-only sender.
- Inbound delivery can be configured through an HTTPS endpoint, Apps Script,
  Pub/Sub, or Dialogflow connection settings.
- Synchronous replies must be returned quickly from the interaction handler;
  longer agent work should use asynchronous Chat API sends to the originating
  space or DM.
- Preserve `space`, `thread`, `message`, event type, and user identity fields
  in provenance, because Google Chat uses those ids for threaded replies.

## Configuration Reference

- `appId`: Google Cloud project id or Chat app id.
- `clientId`: OAuth client id, if the adapter uses user authorization.
- `clientSecret`: OAuth client secret, if the adapter uses user authorization.
- `secret`: request verification or service-account secret reference. A real
  runtime should support service-account JSON or workload identity explicitly.
- `webhookUrl`: HTTPS endpoint URL when the Chat app uses HTTP connection
  settings.
- `serverUrl`: Pub/Sub topic name or deployment reference when using Pub/Sub,
  Apps Script, or Dialogflow instead of HTTP.
- `defaultTarget`: Google Chat `spaces/{space}` id, optionally with thread data
  in the outbound target.
- `allowFrom`: allowed Google Chat `users/{user}` senders.
- `groupAllowFrom`: allowed Google Chat `spaces/{space}` ids.

Required platform setup:

- Enable the Google Chat API in a Google Cloud project and configure the Chat
  app's interactive features.
- Choose exactly one interaction delivery mode: HTTP endpoint, Apps Script,
  Pub/Sub, or Dialogflow.
- Use synchronous responses only for short work; use Chat API message creation
  for agent replies that complete after the interaction response window.

## Official Documentation

- [Google Chat developer docs](https://developers.google.com/workspace/chat)
- [Google Chat API reference](https://developers.google.com/workspace/chat/api/reference/rest)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
