# Connectors

This document describes how Friday should integrate the user-facing connectors
currently exposed by the connector settings catalog.

Scope: this page covers the current Settings connector catalog: Dropbox, Gmail,
Google Calendar, Google Drive, Microsoft Teams, Outlook Calendar, Outlook Email,
and SharePoint. The repository also contains a broader direct-connector catalog
and connector integration primitives, but those are planning/runtime foundations
rather than connectors fully exposed through Settings today.

## Credential Rule

All connector API keys, client secrets, access tokens, refresh tokens, webhook
secrets, and app secrets must come from the local environment. Do not hardcode
secrets in source code, docs, tests, fixture data, or committed configuration.

Friday loads `.env` from the repo/app root before the main process starts, so
connector integration code should resolve secrets through `process.env`.

Example `.env` shape:

```sh
GOOGLE_OAUTH_CLIENT_ID=replace-me
GOOGLE_OAUTH_CLIENT_SECRET=replace-me

DROPBOX_CLIENT_ID=replace-me
DROPBOX_CLIENT_SECRET=replace-me
DROPBOX_ACCESS_TOKEN=replace-me

MICROSOFT_TENANT_ID=replace-me
MICROSOFT_CLIENT_ID=replace-me
MICROSOFT_CLIENT_SECRET=replace-me
MICROSOFT_TEAMS_ACCESS_TOKEN=replace-me
MICROSOFT_OUTLOOK_CALENDAR_ACCESS_TOKEN=replace-me
MICROSOFT_OUTLOOK_EMAIL_ACCESS_TOKEN=replace-me
MICROSOFT_SHAREPOINT_ACCESS_TOKEN=replace-me
```

For OAuth connectors, app-level credentials such as client IDs and client
secrets live in `.env`. User-granted OAuth tokens should be treated as secrets
too; if they are stored locally, they must not be logged, committed, or included
in agent-visible output.

## Integration Pattern

1. Register the connector in the catalog with a stable connector id, display
   name, tool list, required scopes, setup URL, and setup instructions.
2. Read every secret from `.env` via `process.env`; store only non-secret
   connector metadata in normal app state.
3. Prefer OAuth with least-privilege scopes. Use read-only scopes first, then
   add write scopes only for reviewed tools.
4. Expose a narrow tool list with typed input schemas. Search/read tools are the
   default; write, send, delete, sharing, payment, identity, and admin actions
   require explicit approval.
5. Treat connector output as untrusted data. Sanitize output before it enters an
   agent prompt, and redact secrets from audit logs and error messages.
6. Add connector-specific tests for auth status, allowed tools, approval policy,
   and at least one representative read call.

## Current Connectors

| Connector | Environment secrets | Documentation | Example |
| --- | --- | --- | --- |
| Dropbox | `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`, `DROPBOX_ACCESS_TOKEN` | [Dropbox HTTP API](https://www.dropbox.com/developers/documentation/http/overview), [Dropbox OAuth guide](https://developers.dropbox.com/oauth-guide) | Search files: `search_files` with `{ "query": "quarterly report" }`. |
| Gmail | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | [Gmail API guides](https://developers.google.com/workspace/gmail/api/guides), [Gmail API reference](https://developers.google.com/workspace/gmail/api/reference/rest) | Search mail: `search_emails` with `{ "query": "from:alice@example.com newer_than:7d" }`. |
| Google Calendar | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | [Google Calendar API overview](https://developers.google.com/workspace/calendar/api/guides/overview), [Calendar API reference](https://developers.google.com/workspace/calendar/api/v3/reference) | Find events: `search_events` with `{ "query": "planning", "calendarId": "primary" }`. |
| Google Drive | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | [Google Drive API overview](https://developers.google.com/workspace/drive/api/guides/about-sdk), [Drive API reference](https://developers.google.com/drive/api/reference/rest/v3) | Search files: `search_files` with `{ "query": "name contains 'proposal'" }`. |
| Microsoft Teams | `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TEAMS_ACCESS_TOKEN` | [Microsoft Teams Graph overview](https://learn.microsoft.com/en-us/graph/teams-concept-overview), [Teams API reference](https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0) | Search messages: `search` with `{ "query": "deployment incident" }`. |
| Outlook Calendar | `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_OUTLOOK_CALENDAR_ACCESS_TOKEN` | [Outlook calendar API overview](https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview), [Microsoft Graph auth concepts](https://learn.microsoft.com/en-us/graph/auth/auth-concepts) | List events: `list_events` with `{ "calendarId": "primary" }`. |
| Outlook Email | `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_OUTLOOK_EMAIL_ACCESS_TOKEN` | [Outlook mail API overview](https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview), [Microsoft Graph auth concepts](https://learn.microsoft.com/en-us/graph/auth/auth-concepts) | Search messages: `search_messages` with `{ "query": "invoice hasAttachments:true" }`. |
| SharePoint | `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_SHAREPOINT_ACCESS_TOKEN` | [OneDrive files in Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/onedrive?view=graph-rest-1.0), [SharePoint sites API](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0) | Fetch a document: `fetch` with `{ "id": "drive-item-id" }`. |

## Current Runtime Status

Gmail, Google Calendar, and Google Drive have local OAuth and API-client
execution paths. They use `GOOGLE_OAUTH_CLIENT_ID` and
`GOOGLE_OAUTH_CLIENT_SECRET` from the environment, open the system browser for
consent, and receive the OAuth callback on a local loopback server.

Dropbox and the Microsoft connectors are present in the Settings catalog with
tool metadata, scopes, and setup links. Their credential handling should still
follow the env-file rule above. Until they have first-class OAuth flows, treat
manual access-token entry as a local development bridge and keep production
integration code resolving tokens from `.env` or a secret-backed credential
reference.

## Example Connector Config

```ts
const gmailConnector = {
	name: 'Gmail',
	connectorId: 'connector_gmail',
	serverLabel: 'gmail',
	serverDescription: 'Search, read, draft, send, and manage Gmail messages.',
	requireApproval: 'always',
	allowedTools: ['get_profile', 'search_emails', 'read_email', 'create_draft'],
	deferLoading: false,
	enabled: true,
};
```

The connector config contains only metadata and policy. Secrets are resolved
separately:

```ts
const googleOAuth = {
	clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
	clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
};
```
