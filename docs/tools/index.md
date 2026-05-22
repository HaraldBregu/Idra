# Tools

This section explains Friday's agent tools in plain language. It covers the
local tools from [AI tools](../ai/tools.md), the conditional tool families that
can appear at runtime, and the connector tools documented in the provider
pages.

Friday does not expose every tool on every turn. It selects a small set based on
the user's request, enabled settings, available connectors, safety rules, and
the current run context.

## Complete List

See [All tools](all-tools.md) for the one-by-one catalog.

## Core Local Tools

- [read](read.md)
- [write](write.md)
- [edit](edit.md)
- [apply_patch](apply-patch.md)
- [delete](delete.md)
- [copy](copy.md)
- [move](move.md)
- [inspect_file](inspect-file.md)
- [find](find.md)
- [exec](exec.md)
- [process](process.md)
- [web_fetch](web-fetch.md)
- [cron](cron.md)
- [task](task.md)
- [open_browser](open-browser.md)
- [browser](browser.md)

## Conditional Tools And Families

- [startup_files](startup-files.md)
- [heartbeat_respond](heartbeat-respond.md)
- [execute_skill](execute-skill.md)
- [Connector tools](connector-tools.md)
- [Media generation tools](media-generation-tools.md)
- [text_to_image](text-to-image.md)
- [Plugin tools](plugin-tools.md)
- [MCP tools](mcp-tools.md)
- [LSP tools](lsp-tools.md)
- [Client tools](client-tools.md)
- [tool_search](tool-search.md)
- [tool_describe](tool-describe.md)
- [tool_call](tool-call.md)
- [Legacy cron helpers](legacy-cron-helpers.md)

## Active Google Connector Tools

- [Gmail get_profile](gmail-get-profile.md)
- [Gmail search_emails](gmail-search-emails.md)
- [Gmail search_email_ids](gmail-search-email-ids.md)
- [Gmail get_recent_emails](gmail-get-recent-emails.md)
- [Gmail read_email](gmail-read-email.md)
- [Gmail batch_read_email](gmail-batch-read-email.md)
- [Gmail create_draft](gmail-create-draft.md)
- [Gmail send_email](gmail-send-email.md)
- [Gmail trash_email](gmail-trash-email.md)
- [Google Calendar get_profile](google-calendar-get-profile.md)
- [Google Calendar list_calendars](google-calendar-list-calendars.md)
- [Google Calendar search](google-calendar-search.md)
- [Google Calendar fetch](google-calendar-fetch.md)
- [Google Calendar search_events](google-calendar-search-events.md)
- [Google Calendar read_event](google-calendar-read-event.md)
- [Google Calendar create_event](google-calendar-create-event.md)
- [Google Calendar update_event](google-calendar-update-event.md)
- [Google Calendar delete_event](google-calendar-delete-event.md)
- [Google Drive get_profile](google-drive-get-profile.md)
- [Google Drive search_files](google-drive-search-files.md)
- [Google Drive list_recent_files](google-drive-list-recent-files.md)
- [Google Drive read_file_content](google-drive-read-file-content.md)
- [Google Drive get_file_metadata](google-drive-get-file-metadata.md)
- [Google Drive get_file_permissions](google-drive-get-file-permissions.md)
- [Google Drive download_file_content](google-drive-download-file-content.md)
- [Google Drive create_file](google-drive-create-file.md)
- [Google Drive list_drives](google-drive-list-drives.md)
- [Google Drive search](google-drive-search.md)
- [Google Drive recent_documents](google-drive-recent-documents.md)
- [Google Drive fetch](google-drive-fetch.md)

## Catalog-Only Connector Tool Groups

These connector tool names are documented for Settings and future work, but
default local agent execution is not implemented yet.

- [Dropbox catalog tools](dropbox-catalog-tools.md)
- [Outlook Email catalog tools](outlook-email-catalog-tools.md)
- [Outlook Calendar catalog tools](outlook-calendar-catalog-tools.md)
- [Microsoft Teams catalog tools](microsoft-teams-catalog-tools.md)
- [SharePoint catalog tools](sharepoint-catalog-tools.md)
