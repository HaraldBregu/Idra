import { DEFAULT_AGENT_ID } from '../../constants';
import type { AgentConfig, AgentRouteBinding, AgentRoutingSettings, AgentToolPermissionMode } from '../../../../shared/store';

export function resolveDefaultAgentId(settings?: Partial<AgentRoutingSettings>, fallbackAgentId: string = DEFAULT_AGENT_ID): string {
	return settings?.agents?.find((agent) => agent.default)?.id ?? settings?.agents?.[0]?.id ?? fallbackAgentId;
}

export function normalizeAgentConfig(value: unknown): AgentConfig | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	const id = typeof record.id === 'string' ? record.id.trim() : '';
	if (!id) return undefined;
	const config = { ...(record as unknown as AgentConfig), id };
	const model = normalizeModelConfig(record.model);
	if (model) config.model = model;
	else delete config.model;
	const tools = record.tools && typeof record.tools === 'object' && !Array.isArray(record.tools) ? record.tools as Record<string, unknown> : undefined;
	const permissions = normalizeAgentToolPermissions(tools?.permissions);
	if (tools) {
		const nextTools = { ...(config.tools ?? {}) };
		if (permissions) nextTools.permissions = permissions;
		else delete nextTools.permissions;
		config.tools = nextTools;
	}
	return config;
}

export function normalizeAgentRouteBinding(value: unknown): AgentRouteBinding | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	const agentId = optionalString(record.agentId);
	const match = normalizeAgentRouteMatch(record.match);
	if (!agentId || !match) return undefined;
	const session = normalizeAgentRouteSession(record.session);
	return {
		agentId,
		match,
		...(session ? { session } : {}),
	};
}

export function normalizeAgentRoutingSettings(value: unknown): AgentRoutingSettings {
	const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
	const agents = Array.isArray(record.agents) ? record.agents.flatMap((entry) => normalizeAgentConfig(entry) ?? []) : [];
	const bindings = Array.isArray(record.bindings) ? record.bindings.flatMap((entry) => normalizeAgentRouteBinding(entry) ?? []) : [];
	return { agents, bindings };
}

function normalizeAgentToolPermissions(value: unknown): Record<string, AgentToolPermissionMode> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const out: Record<string, AgentToolPermissionMode> = {};
	for (const [toolName, mode] of Object.entries(value as Record<string, unknown>)) {
		const name = toolName.trim();
		if (!name || mode !== 'allow' && mode !== 'deny' && mode !== 'ask') continue;
		out[name] = mode;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeModelConfig(value: unknown): AgentConfig['model'] | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	const providerId = optionalString(record.providerId)?.toLowerCase();
	const modelId = optionalString(record.modelId);
	const effort = record.effort === 'minimal' || record.effort === 'low' || record.effort === 'medium' || record.effort === 'high'
		? record.effort
		: undefined;
	if (!providerId && !modelId && !effort) return undefined;
	return {
		...(providerId ? { providerId } : {}),
		...(modelId ? { modelId } : {}),
		...(effort ? { effort } : {}),
	};
}

function normalizeAgentRouteMatch(value: unknown): AgentRouteBinding['match'] | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	const channel = optionalString(record.channel)?.toLowerCase();
	const accountId = optionalString(record.accountId);
	const peer = normalizeRoutePeer(record.peer, true);
	const parentPeer = normalizeRoutePeer(record.parentPeer, false);
	const roleIds = Array.isArray(record.roleIds)
		? record.roleIds.flatMap((roleId) => optionalString(roleId) ?? [])
		: undefined;
	if (!channel && !accountId && !peer && !parentPeer && !roleIds?.length) return undefined;
	return {
		...(channel ? { channel } : {}),
		...(accountId ? { accountId } : {}),
		...(peer ? { peer } : {}),
		...(parentPeer ? { parentPeer } : {}),
		...(roleIds?.length ? { roleIds } : {}),
	};
}

function normalizeRoutePeer(value: unknown, allowThread: boolean): AgentRouteBinding['match']['peer'] | AgentRouteBinding['match']['parentPeer'] | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	const kind = optionalString(record.kind)?.toLowerCase();
	if (kind !== 'direct' && kind !== 'group' && kind !== 'channel' && (allowThread ? kind !== 'thread' : true)) return undefined;
	const id = optionalString(record.id);
	if (!id) return undefined;
	return { kind, id } as AgentRouteBinding['match']['peer'];
}

function normalizeAgentRouteSession(value: unknown): AgentRouteBinding['session'] | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	const scope = optionalString(record.scope);
	if (scope !== 'main' && scope !== 'per-peer' && scope !== 'per-channel-peer' && scope !== 'per-account-channel-peer') return undefined;
	return { scope };
}

function optionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
