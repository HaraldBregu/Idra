import type { ChannelNormalizedInboundMessage, ChannelChatType } from '../../channels';
import { resolveDefaultAgentId } from './bindings';
import { buildAgentSessionKey } from './session-key';
import type { AgentRouteInput, ResolvedAgentRoute } from './types';

function peerKind(chatType: ChannelChatType): 'direct' | 'group' | 'channel' | 'thread' {
	if (chatType === 'dm') return 'direct';
	return chatType;
}

export function resolveAgentRoute(input: AgentRouteInput): ResolvedAgentRoute {
	const binding = input.settings?.bindings?.find((candidate) => !candidate.match.channel || candidate.match.channel === input.channel);
	const agentId = binding?.agentId ?? resolveDefaultAgentId(input.settings, input.fallbackAgentId);
	const sessionScope = binding?.session?.scope ?? (input.channel ? 'per-account-channel-peer' : 'main');
	return {
		agentId,
		sessionScope,
		sessionKey: buildAgentSessionKey({
			agentId,
			kind: input.channel ? 'channel' : 'main',
			channelId: input.channel,
			accountId: input.accountId,
			peerId: input.peer?.id ?? input.parentPeer?.id ?? 'main',
			scope: sessionScope,
		}),
		...(binding ? { binding } : {}),
	};
}

export function channelMessageRouteInput(message: ChannelNormalizedInboundMessage, settings?: AgentRouteInput['settings']): AgentRouteInput {
	const peer = { kind: peerKind(message.chatType), id: message.threadId?.trim() || message.targetId };
	return { settings, channel: message.channelId, accountId: message.accountId, peer };
}
