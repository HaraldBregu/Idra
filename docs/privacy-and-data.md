# Privacy and Data Handling

Friday is a local-first desktop app, but it can connect to external AI providers, channels, apps, and connectors. Treat local data and outbound requests as sensitive by default.

## Data Classification

| Classification | Examples | Handling |
| --- | --- | --- |
| Public | app version, UI labels, public docs | May be logged if useful |
| Personal | user preferences, app settings, non-sensitive workflow choices | Store only when useful; allow export/delete where practical |
| Private | agent history, workspace paths, channel IDs, connector metadata | Minimize logs; avoid unnecessary prompt injection |
| Sensitive | medical, political, religious, sexual, biometric, legal, financial, or precise identity data | Do not store by default; require explicit user intent |
| Secret | API keys, tokens, passwords, private keys, credentials | Never store in memory; redact from logs and prompts |

## Storage Rules

- Store only what is needed for the feature.
- Prefer structured stores and typed schemas over ad hoc files.
- Separate chat history from long-term memory.
- Keep persistent memory inspectable and deletable.
- Bound short-term history before prompt construction.

## Prompt and Provider Rules

- Send only the minimum context needed for the current turn.
- Label persistent memory as possibly stale or incorrect.
- Do not send secrets or raw credential values to model providers.
- Do not include private connector data unless the user asked for a task that requires it.

## Logging Rules

- Logs may include status, identifiers, and redacted error details.
- Logs must not include API keys, passwords, bearer tokens, private keys, connector secrets, or full sensitive payloads.
- Error handling should preserve debugging value without exposing user data.

## User Rights and Controls

For user-scoped memory and settings, support:

- export
- deletion
- correction
- session-only operation where appropriate

When a module stores sensitive or private data, its API should expose the matching lifecycle operations or document why the data is ephemeral.
