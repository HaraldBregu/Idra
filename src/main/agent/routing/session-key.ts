import type { AgentRouteSessionScope } from '../../../shared/store';
import type { AgentSessionKeyInput } from './types';

function encodePart(value: string): string {
	return encodeURIComponent(value.trim()).replace(/%20/g, '+');
}

function requirePart(value: string | undefined, name: string): string {
	const trimmed = value?.trim();
	if (!trimmed) throw new Error(`${name} is required.`);
	return encodePart(trimmed);
}

export function buildAgentSessionKey(input: AgentSessionKeyInput): string {
	const agentId = requirePart(input.agentId, 'agentId');
	if (input.kind === 'main') return `agent:${agentId}:main`;
	if (input.kind === 'subagent') return `agent:${agentId}:subagent:${requirePart(input.id, 'id')}`;
	if (input.kind === 'task') return `agent:${agentId}:task:${requirePart(input.id, 'id')}`;

	const scope: AgentRouteSessionScope = input.scope ?? 'per-account-channel-peer';
	if (scope === 'main') return `agent:${agentId}:main`;

	const peerId = requirePart(input.peerId, 'peerId');
	if (scope === 'per-peer') return `agent:${agentId}:peer:${peerId}`;

	const channelId = requirePart(input.channelId, 'channelId');
	if (scope === 'per-channel-peer') {
		return `agent:${agentId}:channel:${channelId}:peer:${peerId}`;
	}

	const accountId = requirePart(input.accountId ?? 'default', 'accountId');
	return `agent:${agentId}:channel:${channelId}:account:${accountId}:peer:${peerId}`;
}
