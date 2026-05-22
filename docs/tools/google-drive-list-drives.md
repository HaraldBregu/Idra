# Google Drive list_drives

Google Drive `list_drives` lists shared drives available to the account.

## How It Is Used

- Used when Friday needs to choose between My Drive and shared drives.
- Helps locate files in team or organization drives.
- Supports scoped search and file creation in the right place.

## Boundaries

- It lists drives, not file contents.
- Friday should not assume a shared-drive target when the request is unclear.
