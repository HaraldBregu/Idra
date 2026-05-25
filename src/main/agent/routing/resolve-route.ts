import type { ChannelNormalizedInboundMessage } from '../../channels';
import type { ChannelChatType } from '../../channels/types';
import type { AgentRouteBinding, AgentRoutePeer, AgentRouteSessionScope } from '../../../shared/store';
import { resolveDefaultAgentId } from './bindings';
import { buildAgentSessionKey } from './session-key';
import type { AgentRouteInput, ResolvedAgentRoute } from './types';

function normalize(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed.toLowerCase() : undefined;
}

function samePeer(
	bindingPeer: AgentRoutePeer | undefined,
	inputPeer: AgentRoutePeer | undefined
): boolean {
	if (!bindingPeer) return true;
	if (!inputPeer || bindingPeer.kind !== inputPeer.kind) return false;
	return bindingPeer.id === '*' || bindingPeer.id === inputPeer.id;
}

function intersects(
	left: readonly string[] | undefined,
	right: readonly string[] | undefined
): boolean {
	if (!left || left.length === 0) return true;
	if (!right || right.length === 0) return false;
	const rightSet = new Set(right);
	return left.some((item) => rightSet.has(item));
}

function bindingMatches(binding: AgentRouteBinding, input: AgentRouteInput): boolean {
	const match = binding.match;
	if (match.channel && normalize(match.channel) !== normalize(input.channel)) return false;
	if (match.accountId && match.accountId !== input.accountId) return false;
	if (!samePeer(match.peer, input.peer)) return false;
	if (!samePeer(match.parentPeer, input.parentPeer)) return false;
	if (!intersects(match.roleIds, input.roleIds)) return false;
	return true;
}

function routeScore(binding: AgentRouteBinding): number {
	const match = binding.match;
	if (match.peer && match.peer.id !== '*') return 700;
	if (match.parentPeer) return 600;
	if (match.peer?.id === '*') return 500;
	if (match.roleIds && match.roleIds.length > 0) return 400;
	if (match.accountId) return 300;
	if (match.channel) return 200;
	return 0;
}

function selectBinding(input: AgentRouteInput): AgentRouteBinding | undefined {
	let selected: { binding: AgentRouteBinding; score: number; index: number } | undefined;
	const bindings = input.settings?.bindings ?? [];
	for (let index = 0; index < bindings.length; index += 1) {
		const binding = bindings[index];
		if (!bindingMatches(binding, input)) continue;
		const score = routeScore(binding);
		if (
			!selected ||
			score > selected.score ||
			(score === selected.score && index < selected.index)
		) {
			selected = { binding, score, index };
		}
	}
	return selected?.binding;
}

function sessionScope(
	binding: AgentRouteBinding | undefined,
	channel?: string
): AgentRouteSessionScope {
	if (binding?.session?.scope) return binding.session.scope;
	return channel ? 'per-account-channel-peer' : 'main';
}

function routePeerId(input: AgentRouteInput): string | undefined {
	return input.peer?.id ?? input.parentPeer?.id;
}

export function resolveAgentRoute(input: AgentRouteInput): ResolvedAgentRoute {
	const binding = selectBinding(input);
	const agentId = binding?.agentId ?? resolveDefaultAgentId(input.settings, input.fallbackAgentId);
	const scope = sessionScope(binding, input.channel);
	const sessionKey = buildAgentSessionKey({
		agentId,
		kind: input.channel ? 'channel' : 'main',
		channelId: input.channel,
		accountId: input.accountId,
		peerId: routePeerId(input) ?? 'main',
		scope,
	});
	return {
		agentId,
		sessionKey,
		sessionScope: scope,
		...(binding ? { binding } : {}),
	};
}

function peerKind(chatType: ChannelChatType): AgentRoutePeer['kind'] {
	if (chatType === 'dm') return 'direct';
	if (chatType === 'thread') return 'thread';
	return chatType;
}

function parentPeerKind(chatType: ChannelChatType): AgentRoutePeer['kind'] {
	if (chatType === 'dm') return 'direct';
	if (chatType === 'thread') return 'channel';
	return chatType;
}

function roleIdsFromProvenance(provenance: Record<string, unknown>): string[] | undefined {
	const roleIds = provenance.roleIds;
	if (!Array.isArray(roleIds)) return undefined;
	const normalized = roleIds.flatMap((roleId) =>
		typeof roleId === 'string' && roleId.trim() ? [roleId.trim()] : []
	);
	return normalized.length > 0 ? normalized : undefined;
}

export function channelMessageRouteInput(
	message: ChannelNormalizedInboundMessage,
	settings?: AgentRouteInput['settings']
): AgentRouteInput {
	const hasThread = Boolean(message.threadId?.trim());
	const peer = hasThread
		? { kind: 'thread' as const, id: message.threadId!.trim() }
		: { kind: peerKind(message.chatType), id: message.targetId };
	const parentPeer = hasThread
		? { kind: parentPeerKind(message.chatType), id: message.targetId }
		: undefined;
	return {
		settings,
		channel: message.channelId,
		accountId: message.accountId,
		peer,
		...(parentPeer ? { parentPeer } : {}),
		roleIds: roleIdsFromProvenance(message.provenance),
	};
}
