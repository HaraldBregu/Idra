# QA Channel

Catalog metadata for Friday's QA channel.

| Field | Value |
| --- | --- |
| Channel id | `qa-channel` |
| Label | QA Channel |
| Aliases | none |
| Runtime | Hidden catalog-only |

QA Channel is an internal synthetic test channel for local QA and contract
tests. It has no external runtime adapter.

The catalog entry is hidden: it is available to code and tests through the
shared channel catalog, but it should not appear in the Settings channel
catalog.

## Implementation Contract

Synthetic channel tests should use Friday's unified channel gateway described in
[Channel subsystem](../index.md#unified-gateway-contract). Test runtimes must
convert message-in fixtures to `ChannelInboundMessage`, accept message-out
assertions as `ChannelOutboundMessage`, and assert `ChannelMessageReceipt`
delivery results. The synthetic runtime must not call the agent directly.

## Local QA Notes

- This channel is for synthetic channel-contract tests and should not require
  external credentials.
- Test fixtures should exercise normalization, admission decisions,
  idempotency, threading, outbound receipts, and runtime status transitions.
- Keep fixture payloads provider-neutral unless a test is explicitly validating
  how a real provider payload maps into the unified gateway contract.
- Do not expose this channel in user-facing setup surfaces unless a test mode
  requires it.

## Configuration Reference

- `enabled`: test-only switch for local QA accounts.
- `defaultTarget`: synthetic conversation target, such as `qa:default`.
- `allowFrom`: synthetic sender ids accepted by direct-message tests.
- `groupAllowFrom`: synthetic room or group ids accepted by group tests.
- `heartbeat`: optional heartbeat visibility overrides for status tests.

This channel must not require external credentials. Tests should inject fixture
payloads and expected receipts directly through the channel contract.

## Official Documentation

Internal synthetic test channel. There is no external official documentation.

## Related Docs

- [Channel subsystem](../index.md)
- [Unified gateway contract](../index.md#unified-gateway-contract)
