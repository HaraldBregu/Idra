# Google Drive create_file

Google Drive `create_file` creates a new file in Drive.

## How It Is Used

- Used when the user asks Friday to save new content into Google Drive.
- Can create documents or other supported files with the requested name and
  content.
- Fits workflows where the output should live in the user's Drive account.

## Boundaries

- It changes the external Drive account.
- Friday should confirm the intended name, location, and content when they are
  not clear.
