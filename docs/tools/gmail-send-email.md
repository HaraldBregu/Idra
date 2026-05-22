# Gmail send_email

Gmail `send_email` sends an email from the connected account.

## How It Is Used

- Used only when the user asks Friday to send mail.
- Sends the prepared message to the selected recipients.
- Fits direct workflows where the user has already provided the necessary
  sending intent.

## Boundaries

- It changes the external mailbox by sending a real message.
- Friday should be especially careful with recipients, subject, and body before
  using it.
