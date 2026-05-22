# All Tools

This page lists the tools one by one and explains how Friday uses them without
going into code or implementation details.

## Core Local Tools

| Tool | How Friday uses it |
| --- | --- |
| [read](read.md) | Looks at an existing workspace file before answering questions or making changes. |
| [write](write.md) | Creates a new file or replaces a file when the requested outcome needs new content saved. |
| [edit](edit.md) | Changes a specific part of an existing file after Friday has read it. |
| [apply_patch](apply-patch.md) | Applies a planned set of file changes when several edits need to land together. |
| [delete](delete.md) | Removes a file when the user asks for it or when Friday's own change makes the file obsolete. |
| [copy](copy.md) | Duplicates a file so existing content can be reused elsewhere. |
| [move](move.md) | Renames or relocates a file while preserving its contents. |
| [inspect_file](inspect-file.md) | Checks basic facts about a file, such as what kind of file it is and whether it can be previewed. |
| [find](find.md) | Locates files by name or pattern so Friday can work in the right part of the workspace. |
| [exec](exec.md) | Runs an approved workspace command for checks, builds, tests, or project utilities. |
| [process](process.md) | Reviews or stops background commands that Friday started earlier. |
| [web_fetch](web-fetch.md) | Reads text from a web address when the answer depends on external page content. |
| [cron](cron.md) | Saves future, delayed, recurring, or reminder-style agent work. |
| [task](task.md) | Starts an immediate background agent run that should not block the current app session. |
| [open_browser](open-browser.md) | Opens a safe web address in the user's browser. |
| [browser](browser.md) | Uses a managed browser for navigation, screenshots, and page interaction. |

## Conditional Tools And Families

| Tool or family | How Friday uses it |
| --- | --- |
| [startup_files](startup-files.md) | Gives a bootstrap run only the startup context it is allowed to inspect. |
| [heartbeat_respond](heartbeat-respond.md) | Reports heartbeat status when heartbeat tool reporting is enabled. |
| [execute_skill](execute-skill.md) | Runs an executable skill selected for the current request. |
| [Connector tools](connector-tools.md) | Lets enabled account connectors expose actions such as mail, calendar, or drive work. |
| [Media generation tools](media-generation-tools.md) | Lets configured media modules create speech, images, video, sound, or related assets. |
| [text_to_image](text-to-image.md) | Creates, edits, or varies images when image generation is configured. |
| [Plugin tools](plugin-tools.md) | Adds tools supplied by enabled plugins for a specific run. |
| [MCP tools](mcp-tools.md) | Adds tools supplied by configured Model Context Protocol servers. |
| [LSP tools](lsp-tools.md) | Adds code-intelligence tools when a language service is available. |
| [Client tools](client-tools.md) | Adds tools hosted by the client application for a specific run. |
| [tool_search](tool-search.md) | Searches hidden tool catalogs when the full list is too large to show directly. |
| [tool_describe](tool-describe.md) | Shows details for a hidden tool before it is used. |
| [tool_call](tool-call.md) | Runs a hidden tool after it has been selected through tool search. |
| [Legacy cron helpers](legacy-cron-helpers.md) | Names older scheduling helpers that exist for compatibility but are not current default tools. |

## Active Google Connector Tools

| Tool | How Friday uses it |
| --- | --- |
| [Gmail get_profile](gmail-get-profile.md) | Confirms which Gmail account is connected. |
| [Gmail search_emails](gmail-search-emails.md) | Finds Gmail messages that match a user request. |
| [Gmail search_email_ids](gmail-search-email-ids.md) | Finds matching Gmail message identifiers for follow-up reads. |
| [Gmail get_recent_emails](gmail-get-recent-emails.md) | Shows recent Gmail messages for quick review. |
| [Gmail read_email](gmail-read-email.md) | Opens one Gmail message so Friday can summarize or answer about it. |
| [Gmail batch_read_email](gmail-batch-read-email.md) | Opens a small group of Gmail messages together. |
| [Gmail create_draft](gmail-create-draft.md) | Prepares an email draft without sending it. |
| [Gmail send_email](gmail-send-email.md) | Sends an email when the user has asked Friday to do so. |
| [Gmail trash_email](gmail-trash-email.md) | Moves a Gmail message to trash when the user asks to remove it. |
| [Google Calendar get_profile](google-calendar-get-profile.md) | Confirms which Google account owns the calendar connection. |
| [Google Calendar list_calendars](google-calendar-list-calendars.md) | Shows available calendars so Friday can use the right one. |
| [Google Calendar search](google-calendar-search.md) | Searches calendar content in a broad way. |
| [Google Calendar fetch](google-calendar-fetch.md) | Retrieves a specific calendar item. |
| [Google Calendar search_events](google-calendar-search-events.md) | Finds events that match a user request. |
| [Google Calendar read_event](google-calendar-read-event.md) | Opens one event for details. |
| [Google Calendar create_event](google-calendar-create-event.md) | Adds a new calendar event. |
| [Google Calendar update_event](google-calendar-update-event.md) | Changes an existing calendar event. |
| [Google Calendar delete_event](google-calendar-delete-event.md) | Removes an event from the calendar. |
| [Google Drive get_profile](google-drive-get-profile.md) | Confirms which Google account owns the Drive connection. |
| [Google Drive search_files](google-drive-search-files.md) | Finds Drive files by name, type, or request context. |
| [Google Drive list_recent_files](google-drive-list-recent-files.md) | Shows recently used Drive files. |
| [Google Drive read_file_content](google-drive-read-file-content.md) | Reads supported text content from a Drive file. |
| [Google Drive get_file_metadata](google-drive-get-file-metadata.md) | Shows file details such as ownership and timestamps. |
| [Google Drive get_file_permissions](google-drive-get-file-permissions.md) | Reviews who can access a Drive file. |
| [Google Drive download_file_content](google-drive-download-file-content.md) | Retrieves Drive file content for inspection or use in the workspace. |
| [Google Drive create_file](google-drive-create-file.md) | Creates a new file in Drive. |
| [Google Drive list_drives](google-drive-list-drives.md) | Lists shared drives available to the account. |
| [Google Drive search](google-drive-search.md) | Searches Drive through the connector's general search path. |
| [Google Drive recent_documents](google-drive-recent-documents.md) | Finds recent document-style files. |
| [Google Drive fetch](google-drive-fetch.md) | Opens a Drive item by id so Friday can use its details or content. |

## Catalog-Only Connector Tool Groups

| Group | Status |
| --- | --- |
| [Dropbox catalog tools](dropbox-catalog-tools.md) | Tool names are documented, but default local execution is not implemented yet. |
| [Outlook Email catalog tools](outlook-email-catalog-tools.md) | Tool names are documented, but default local execution is not implemented yet. |
| [Outlook Calendar catalog tools](outlook-calendar-catalog-tools.md) | Tool names are documented, but default local execution is not implemented yet. |
| [Microsoft Teams catalog tools](microsoft-teams-catalog-tools.md) | Tool names are documented, but default local execution is not implemented yet. |
| [SharePoint catalog tools](sharepoint-catalog-tools.md) | Tool names are documented, but default local execution is not implemented yet. |
