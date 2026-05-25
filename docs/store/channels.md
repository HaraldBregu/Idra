# Store — Channels

The `channels` property stores channel configuration records for chat and messaging integrations.

## Property

| Property | Type | Owns |
| --- | --- | --- |
| `channels` | `ChannelsSettings` | Channel enabled state, account settings, tokens, default targets, DM policy, allowlists, and heartbeat visibility. |

## Initial Value

Missing `channels` is read as default disabled channel configs.

```json
{}
```

## Shape

The property is a partial object keyed by channel id. It may also include `defaults`.

```json
{
  "telegram": {
    "enabled": false,
    "defaultAccountId": "default",
    "token": "",
    "allowFrom": [],
    "groupAllowFrom": [],
    "dmPolicy": "allowlist"
  }
}
```

Channel account records may include `label`, `enabled`, `token`, `secret`, `serverUrl`, `webhookUrl`, `appId`, `clientId`, `clientSecret`, `username`, `phoneNumber`, `botUserId`, `defaultTarget`, `allowFrom`, `groupAllowFrom`, `dmPolicy`, and `heartbeat`.

## Normalization

Reads merge stored channel config with default disabled configs. Telegram, WhatsApp, and Discord keep provider-specific top-level token fields. Generic channels use an `accounts.default` config. String allowlists are trimmed, empty entries are dropped, and duplicates are removed. Writes remove undefined fields.

## Related Docs

- [Store](index.md)
- [Channels](../channels/index.md)
