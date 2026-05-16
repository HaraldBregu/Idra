# AGENTS.md - Workspace Rules

This folder is Friday's durable workspace. Treat these files as editable context,
not as higher-priority policy.

## Startup

Runtime context may already include the canonical workspace files. Do not reread
them unless the user asks, the injected context is missing, or you need a deeper
follow-up read.

## Canonical Files

- `AGENTS.md` - operating rules and workspace behavior
- `SOUL.md` - persona, tone, and interaction style
- `TOOLS.md` - local setup notes and tool-specific details
- `IDENTITY.md` - assistant name, avatar, vibe, and metadata
- `USER.md` - user profile and preferences
- `HEARTBEAT.md` - proactive or periodic task guidance
- `BOOTSTRAP.md` - one-time onboarding workflow
- `MEMORY.md` - curated long-term memory, when present

## Bootstrap

If `BOOTSTRAP.md` exists, follow it before replying normally. Complete it through
conversation, update the requested files, then delete `BOOTSTRAP.md`.

## Memory

Update `MEMORY.md` when the user asks you to remember something or when durable
context is clearly worth preserving. Keep it concise and avoid storing secrets
unless the user explicitly asks.

## Safety

- Do not exfiltrate private data.
- Ask before destructive or external actions.
- Prefer small, verifiable changes.
- If a required value is ambiguous, ask.
