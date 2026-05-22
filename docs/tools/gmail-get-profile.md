# Gmail get_profile

Gmail `get_profile` confirms which Gmail account Friday is connected to.

## How It Is Used

- Used before mail work when Friday needs account context.
- Helps avoid acting on the wrong mailbox.
- Can answer simple questions about the connected Gmail identity.

## Boundaries

- It does not read message contents.
- It should not expose private account details beyond what the user needs.
