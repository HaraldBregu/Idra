# Feishu Channel

Catalog metadata for Friday's Feishu channel.

| Field | Value |
| --- | --- |
| Channel id | `feishu` |
| Label | Feishu |
| Aliases | `lark` |
| Runtime | Catalog-only |

Feishu can be configured in Settings, but Friday does not currently bundle a
Feishu runtime adapter.

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

- Feishu and Lark bot adapters should use the Open Platform bot capability with
  event subscriptions for inbound messages and the IM message API for outbound
  sends.
- Inbound message events use `im.message.receive_v1`; validate events with
  signature verification or Verification Token handling before dispatch.
- Sending messages uses `POST /open-apis/im/v1/messages` with a
  `tenant_access_token`; Feishu documents per-user and per-group anti-spam
  limits that adapters must back off on.
- Preserve `message_id`, `chat_id`, `open_id`, `union_id`, tenant, and message
  type facts in provenance.

## Official Documentation

- [Feishu Open Platform](https://open.feishu.cn/document/home/index)
- [Lark Developer](https://open.larksuite.com/document/home/index)

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
