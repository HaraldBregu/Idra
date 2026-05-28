# Heartbeat

Heartbeat runs periodic agent check-ins so Friday can surface reminders, alerts, or lightweight status updates without waiting for a user message.

## Functionality

- Runs scheduled agent turns for the main assistant or configured heartbeat agents.
- Supports manual wake requests.
- Can suppress quiet results while still delivering actionable messages.
- Routes heartbeat output to the app, the last active target, or a configured channel.
- Stores lightweight run and delivery state.

## Scheduling

Heartbeat uses a store-backed interval. The default interval is 30 minutes. When Anthropic OAuth is the active authentication mode, the default interval is 1 hour. Setting the interval to 0 disables automatic heartbeat runs.

Runs can be limited to active hours. Heartbeat can also skip when the agent is already busy, when cron work is active, or when a configured heartbeat agent is disabled. Manual wake bypasses the normal timer delay but still uses the current heartbeat configuration.

## Agent Turns

Each heartbeat run invokes the agent with current provider and model settings. Provider selection is not duplicated in heartbeat state.

Heartbeat can use the default prompt, an optional heartbeat context file, isolated sessions, and lighter context loading. A response of `HEARTBEAT_OK` is treated as a quiet success. Structured responses can carry alert text, suggested actions, and delivery metadata.

## Delivery

Heartbeat delivery can target no visible destination, the last active destination, or a specific channel account and recipient. Channel delivery uses the same channel registry as normal inbound and outbound chat messages.

Visibility settings control whether quiet successes are shown, whether alerts are displayed, and whether an app indicator should update. Delivery results are stored so the UI can show the latest heartbeat state.

## State And Safety

Heartbeat state is intentionally small: last run metadata, last delivery metadata, and current configuration. Heartbeat prompts should not contain secrets. Scheduled runs may create provider cost, so interval, active hours, and delivery targets should be configured deliberately.
