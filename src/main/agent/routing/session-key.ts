import type { AgentSessionKeyInput } from './types';

function clean(value: string | undefined): string {
	return (value ?? 'main').trim().replace(/[^a-zA-Z0-9._:-]+/g, '_') || 'main';
}

export function buildAgentSessionKey(input: AgentSessionKeyInput): string {
	if (input.scope === 'main') return clean(input.agentId);
	return [input.agentId, input.kind, input.channelId, input.accountId, input.peerId, input.id].filter(Boolean).map((part) => clean(String(part))).join(':');
}
