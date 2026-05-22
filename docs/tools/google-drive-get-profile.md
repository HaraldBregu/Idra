# Google Drive get_profile

Google Drive `get_profile` confirms which Google account is connected.

## How It Is Used

- Used when Drive work needs account context.
- Helps avoid searching or creating files in the wrong account.
- Can answer basic questions about the connected Drive identity.

## Boundaries

- It does not read files.
- It should reveal only account context needed for the task.
