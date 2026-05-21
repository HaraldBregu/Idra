# Connectors

This document describes Friday's user-facing connector catalog, how connector
credentials are handled, and which connectors have local runtime execution
today.

Scope: this page covers the Settings connector catalog: Dropbox, Gmail, Google
Calendar, Google Drive, Microsoft Teams, Outlook Calendar, Outlook Email, and
SharePoint. The repository also contains a broader direct-connector catalog and
connector integration primitives, but those are planning/runtime foundations
rather than connectors fully exposed through Settings today.

## Source Of Truth

Keep these docs aligned with the connector implementation:

- `OPENAI_CONNECTOR_CATALOG` in `src/shared/connectors.ts` defines the visible
  Settings catalog, setup links, scopes, and tool names.
- `ConnectorsService` in `src/main/connectors/service.ts` owns stored connector
  validation, status, OAuth connection, local tool execution, generated agent
  tool names, and redaction.
- `src/main/connectors/google.ts` owns Google OAuth URLs, scopes, API clients,
  request projection, and token refresh behavior.
- `src/renderer/src/pages/settings/pages/connectors/Page.tsx` owns the Settings
  configuration flow shown to users.

When changing a connector, update the catalog, local runtime tests, and this
documentation in the same change.

## Runtime Matrix

| Connector                               | Catalog id                  | Runtime status                                 | Auth configured in Settings |
| --------------------------------------- | --------------------------- | ---------------------------------------------- | --------------------------- |
| [Dropbox](dropbox.md)                   | `connector_dropbox`         | Catalog only; no local `callTool` strategy yet | Manual OAuth access token   |
| [Gmail](gmail.md)                       | `connector_gmail`           | Local Google OAuth and local tool execution    | Google OAuth connect flow   |
| [Google Calendar](google-calendar.md)   | `connector_googlecalendar`  | Local Google OAuth and local tool execution    | Google OAuth connect flow   |
| [Google Drive](google-drive.md)         | `connector_googledrive`     | Local Google OAuth and local tool execution    | Google OAuth connect flow   |
| [Microsoft Teams](microsoft-teams.md)   | `connector_microsoftteams`  | Catalog only; no local `callTool` strategy yet | Manual OAuth access token   |
| [Outlook Calendar](outlook-calendar.md) | `connector_outlookcalendar` | Catalog only; no local `callTool` strategy yet | Manual OAuth access token   |
| [Outlook Email](outlook-email.md)       | `connector_outlookemail`    | Catalog only; no local `callTool` strategy yet | Manual OAuth access token   |
| [SharePoint](sharepoint.md)             | `connector_sharepoint`      | Catalog only; no local `callTool` strategy yet | Manual OAuth access token   |

Catalog-only connectors can be configured and listed in Settings, but local
agent tool calls for them currently fail with a not-implemented error. Add a
local strategy in `ConnectorsService` before relying on them in the default
agent tool runtime.

## Credential Rule

All connector API keys, client secrets, access tokens, refresh tokens, webhook
secrets, and app secrets must come from the local environment. Do not hardcode
secrets in source code, docs, tests, fixture data, or committed configuration.

Friday loads `.env` from the repo root or app root before the main process
starts, so connector integration code should resolve app-level secrets through
`process.env`.

Current implementation details:

- Google connectors read `GOOGLE_OAUTH_CLIENT_ID` and
  `GOOGLE_OAUTH_CLIENT_SECRET` from `process.env` when connecting or refreshing
  tokens. The stored connector record keeps user OAuth tokens, strips client
  credentials, and redacts tokens from IPC responses.
- Dropbox and Microsoft connectors currently use the Settings
  `authorization` field for a manually pasted OAuth access token. The env names
  below are the reserved secret names for local development and future
  secret-backed runtime work; `ConnectorsService` does not read them yet.
- User-granted OAuth tokens are secrets. Do not log them, commit them, include
  them in prompt context, or paste real values into examples.

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

## Settings Workflow

1. Choose a catalog connector in Settings.
2. Use a stable `serverLabel`. Generated agent tools are named
   `<serverLabel>_<toolName>`, lowercased and normalized to letters, numbers,
   and underscores.
3. Select `allowedTools`. An empty list exposes every catalog tool. A non-empty
   list narrows both the generated tools and, for Google connectors, the OAuth
   scopes requested during the consent flow.
4. Configure auth:
   - Google connectors: save the connector, then use Connect to complete local
     OAuth in the system browser.
   - Catalog-only connectors: paste an OAuth access token into the Settings
     access-token field for local development only.
5. Refresh tools after changing `allowedTools`, then use Test to confirm the
   stored status.

## Agent Tool Exposure

`ConnectorsService.createAgentTools()` adds connector tools to the default
agent runtime only when a connector is enabled and configured.

Generated tool names follow this pattern:

```text
<serverLabel>_<rawToolName>
```

For example, a Gmail connector with `serverLabel` set to `gmail` exposes
`gmail_search_emails`, `gmail_read_email`, and other selected Gmail tools.

Treat all connector output as untrusted data. Sanitize or summarize external
content before passing it into long-lived memory, logs, startup files, or other
agent-visible state.

## Approval And Tool Safety

Connector configs support `requireApproval` values of `always`, `never`, and
`never_for_allowed_tools`. The current local connector approval hook only marks
Google Drive `create_file` as approval-sensitive. Keep `allowedTools` narrow
for any connector that can send, create, update, delete, share, or otherwise
mutate external data.

Recommended defaults:

- Start with read/search tools only.
- Add write tools only after checking scopes, schemas, tests, and user-facing
  confirmation behavior.
- Never expose broad admin, sharing, identity, payment, or destructive tools
  without a dedicated policy review.

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
6. Add a local tool strategy before exposing a connector through the default
   agent runtime.
7. Add connector-specific tests for auth status, allowed tools, approval policy,
   redaction, scope selection, and at least one representative read call.

## Current Connectors

The connector names below link to the per-connector markdown files for the
current Settings connector catalog. Environment secrets are app-level or
reserved secret names; see the credential rule above for the current storage
boundary.

| Connector                               | Environment secrets                                                                                                | Platform documentation                                                                                                                                                                                                                | Example                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Dropbox](dropbox.md)                   | `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`, `DROPBOX_ACCESS_TOKEN`                                               | [Dropbox HTTP API](https://www.dropbox.com/developers/documentation/http/overview), [Dropbox OAuth guide](https://developers.dropbox.com/oauth-guide)                                                                                 | Search files: `search_files` with `{ "query": "quarterly report" }`.                     |
| [Gmail](gmail.md)                       | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`                                                             | [Gmail API guides](https://developers.google.com/workspace/gmail/api/guides), [Gmail API reference](https://developers.google.com/workspace/gmail/api/reference/rest)                                                                 | Search mail: `search_emails` with `{ "query": "from:alice@example.com newer_than:7d" }`. |
| [Google Calendar](google-calendar.md)   | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`                                                             | [Google Calendar API overview](https://developers.google.com/workspace/calendar/api/guides/overview), [Calendar API reference](https://developers.google.com/workspace/calendar/api/v3/reference)                                     | Find events: `search_events` with `{ "query": "planning", "calendarId": "primary" }`.    |
| [Google Drive](google-drive.md)         | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`                                                             | [Google Drive API overview](https://developers.google.com/workspace/drive/api/guides/about-sdk), [Drive API reference](https://developers.google.com/drive/api/reference/rest/v3)                                                     | Search files: `search_files` with `{ "query": "name contains 'proposal'" }`.             |
| [Microsoft Teams](microsoft-teams.md)   | `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TEAMS_ACCESS_TOKEN`            | [Microsoft Teams Graph overview](https://learn.microsoft.com/en-us/graph/teams-concept-overview), [Teams API reference](https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0)                 | Search messages: `search` with `{ "query": "deployment incident" }`.                     |
| [Outlook Calendar](outlook-calendar.md) | `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_OUTLOOK_CALENDAR_ACCESS_TOKEN` | [Outlook calendar API overview](https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview), [Microsoft Graph auth concepts](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)                               | List events: `list_events` with `{ "calendarId": "primary" }`.                           |
| [Outlook Email](outlook-email.md)       | `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_OUTLOOK_EMAIL_ACCESS_TOKEN`    | [Outlook mail API overview](https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview), [Microsoft Graph auth concepts](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)                                       | Search messages: `search_messages` with `{ "query": "invoice hasAttachments:true" }`.    |
| [SharePoint](sharepoint.md)             | `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_SHAREPOINT_ACCESS_TOKEN`       | [OneDrive files in Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/onedrive?view=graph-rest-1.0), [SharePoint sites API](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0) | Fetch a document: `fetch` with `{ "id": "drive-item-id" }`.                              |

## Google Runtime Details

Gmail, Google Calendar, and Google Drive have local OAuth and API-client
execution paths. They use `GOOGLE_OAUTH_CLIENT_ID` and
`GOOGLE_OAUTH_CLIENT_SECRET` from the environment, open the system browser for
consent, and receive the OAuth callback on a local loopback server.

Google OAuth requests scopes based on the connector's selected tools:

- Gmail starts with profile and readonly scopes, then adds compose, send, or
  modify scopes only when matching tools are enabled.
- Google Calendar starts with profile and read scopes, then adds event write
  scope for create, update, or delete tools.
- Google Drive starts with profile scope, adds Drive readonly for file tools,
  and adds Drive file scope only for `create_file`.

If `allowedTools` is empty, every catalog tool is enabled and Google OAuth asks
for all scopes needed by that connector.

## Catalog-Only Runtime Work

Dropbox and the Microsoft connectors are present in Settings with tool
metadata, scopes, and setup links. Before production use through the default
agent runtime, each one still needs:

- A real OAuth or secret-backed credential flow.
- Token refresh or expiration handling where the platform requires it.
- A local `ConnectorToolStrategy` in `ConnectorsService`.
- Typed schemas and output projection for every enabled tool.
- Tests for auth state, allowed-tool filtering, redaction, and representative
  read calls.

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

The connector config contains metadata, policy, selected tools, and connector
auth state. App-level secrets are resolved separately:

```ts
const googleOAuth = {
	clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
	clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
};
```
