# Connector Tools

Connector tools are account-backed actions from services such as Gmail, Google
Calendar, and Google Drive.

## How They Are Used

- Used when a connected account is enabled and the user's request needs that
  service.
- Let Friday read, search, create, or update external account data according to
  the connector's allowed tools.
- Use the connector's configured account and permissions instead of putting
  secrets into the request.

## Current Status

- Gmail, Google Calendar, and Google Drive have local tool execution documented
  in this section.
- Dropbox and Microsoft connector tool names are cataloged, but default local
  execution is not implemented yet.

## Boundaries

- Friday should expose only the smallest useful connector surface for the task.
- Mutating tools, such as sending email or deleting calendar events, should be
  enabled only when the workflow needs them.
