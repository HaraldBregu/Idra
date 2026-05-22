# Google Calendar update_event

Google Calendar `update_event` changes an existing event.

## How It Is Used

- Used when the user asks to reschedule, rename, or otherwise adjust an event.
- Should follow a search or read that identifies the exact event.
- Keeps the existing event while applying the requested change.

## Boundaries

- It changes calendar data.
- Friday should avoid editing the wrong event when multiple matches exist.
