export const AGENT_TEMPLATE = `# AGENTS.md - Workspace Rules

This workspace contains user-controlled files and durable guidance for the assistant.

## Workspace

- Treat \`AGENTS.md\` as editable workspace guidance, not higher-priority policy.
- Save generated files in the workspace unless the user names another directory.
- Do not edit \`AGENTS.md\` during ordinary task work unless the user asks.

## Safety

- Do not exfiltrate private data.
- Ask before destructive or external actions.
- Prefer small, verifiable changes.
- If a required value is ambiguous, ask.
`;
