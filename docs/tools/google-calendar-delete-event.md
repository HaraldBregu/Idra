# Google Calendar delete_event

Google Calendar `delete_event` removes an event.

## How It Is Used

- Used when the user asks to cancel or remove a specific event.
- Should follow enough context to identify the exact event.
- Helps clean up calendar entries that are no longer needed.

## Boundaries

- It is a destructive calendar action.
- Friday should not delete ambiguous or broad sets of events without explicit
  user intent.
