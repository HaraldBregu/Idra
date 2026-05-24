import { DEFAULT_AGENT_ID } from '../../constants';
import type {
	AgentConfig,
	AgentRouteBinding,
	AgentRoutePeer,
	AgentRouteSessionScope,
	AgentRoutingSettings,
} from '../../store/types';

const SESSION_SCOPES = new Set<AgentRouteSessionScope>([
	'main',
	'per-peer',
	'per-channel-peer',
	'per-account-channel-peer',
]);

function normalizeId(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function normalizeLowerId(value: unknown): string | undefined {
	return normalizeId(value)?.toLowerCase();
}

function normalizeStringList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const list = [
		...new Set(value.flatMap((item) => (typeof item === 'string' && item.trim() ? [item.trim()] : []))),
	];
	return list.length > 0 ? list : undefined;
}

function normalizePositiveInteger(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function normalizePeer(value: unknown, allowThread: boolean): AgentRoutePeer | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const kind = normalizeLowerId(record.kind);
	const allowedKinds = allowThread
		? new Set(['direct', 'group', 'channel', 'thread'])
		: new Set(['direct', 'group', 'channel']);
	if (!kind || !allowedKinds.has(kind)) {
		return undefined;
	}
	const id = normalizeId(record.id);
	return id ? { kind: kind as AgentRoutePeer['kind'], id } : undefined;
}

export function normalizeAgentConfig(value: unknown): AgentConfig | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const id = normalizeId(record.id);
	if (!id) return undefined;
	const model = readRecord(record.model);
	const tools = readRecord(record.tools);
	const subagents = readRecord(record.subagents);
	const childModel = readRecord(subagents?.model);
	const config: AgentConfig = { id };
	if (record.default === true) config.default = true;
	const name = normalizeId(record.name);
	if (name) config.name = name;
	const workspace = normalizeId(record.workspace);
	if (workspace) config.workspace = workspace;
	const providerId = normalizeLowerId(model?.providerId);
	const modelId = normalizeId(model?.modelId);
	if (providerId || modelId || typeof model?.effort === 'string') {
		config.model = {
			...(providerId ? { providerId } : {}),
			...(modelId ? { modelId } : {}),
			...(typeof model?.effort === 'string'
				? { effort: model.effort as NonNullable<AgentConfig['model']>['effort'] }
				: {}),
		};
	}
	const skills = normalizeStringList(record.skills);
	if (skills) config.skills = skills;
	if (tools) {
		const allow = normalizeStringList(tools.allow);
		const alsoAllow = normalizeStringList(tools.alsoAllow);
		const deny = normalizeStringList(tools.deny);
		config.tools = {
			...(tools.profile === 'minimal' ||
			tools.profile === 'coding' ||
			tools.profile === 'messaging' ||
			tools.profile === 'full'
				? { profile: tools.profile }
				: {}),
			...(allow ? { allow } : {}),
			...(alsoAllow ? { alsoAllow } : {}),
			...(deny ? { deny } : {}),
			...(readRecord(tools.fs) ? { fs: tools.fs as NonNullable<AgentConfig['tools']>['fs'] } : {}),
			...(readRecord(tools.exec) ? { exec: tools.exec as Record<string, unknown> } : {}),
		};
	}
	if (subagents) {
		const allowAgents = normalizeStringList(subagents.allowAgents);
		const childProviderId = normalizeLowerId(childModel?.providerId);
		const childModelId = normalizeId(childModel?.modelId);
		config.subagents = {
			...(allowAgents ? { allowAgents } : {}),
			...(normalizePositiveInteger(subagents.maxSpawnDepth)
				? { maxSpawnDepth: normalizePositiveInteger(subagents.maxSpawnDepth) }
				: {}),
			...(normalizePositiveInteger(subagents.maxChildrenPerAgent)
				? { maxChildrenPerAgent: normalizePositiveInteger(subagents.maxChildrenPerAgent) }
				: {}),
			...(subagents.requireAgentId === true ? { requireAgentId: true } : {}),
			...(childProviderId || childModelId || typeof childModel?.effort === 'string'
				? {
						model: {
							...(childProviderId ? { providerId: childProviderId } : {}),
							...(childModelId ? { modelId: childModelId } : {}),
							...(typeof childModel?.effort === 'string'
								? { effort: childModel.effort as NonNullable<AgentConfig['model']>['effort'] }
								: {}),
						},
					}
				: {}),
			...(normalizePositiveInteger(subagents.runTimeoutSeconds)
				? { runTimeoutSeconds: normalizePositiveInteger(subagents.runTimeoutSeconds) }
				: {}),
		};
	}
	return config;
}

export function normalizeAgentRouteBinding(value: unknown): AgentRouteBinding | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const agentId = normalizeId(record.agentId);
	const match = readRecord(record.match);
	if (!agentId || !match) return undefined;
	const channel = normalizeLowerId(match.channel);
	const accountId = normalizeId(match.accountId);
	const peer = normalizePeer(match.peer, true);
	const parentPeer = normalizePeer(match.parentPeer, false) as AgentRouteBinding['match']['parentPeer'];
	const roleIds = normalizeStringList(match.roleIds);
	if (!channel && !accountId && !peer && !parentPeer && !roleIds) return undefined;
	const session = readRecord(record.session);
	const scope = normalizeId(session?.scope);
	return {
		agentId,
		match: {
			...(channel ? { channel } : {}),
			...(accountId ? { accountId } : {}),
			...(peer ? { peer } : {}),
			...(parentPeer ? { parentPeer } : {}),
			...(roleIds ? { roleIds } : {}),
		},
		...(scope && SESSION_SCOPES.has(scope as AgentRouteSessionScope)
			? { session: { scope: scope as AgentRouteSessionScope } }
			: {}),
	};
}

export function normalizeAgentRoutingSettings(value: unknown): AgentRoutingSettings {
	const record = readRecord(value);
	const agents = Array.isArray(record?.agents)
		? record.agents.flatMap((entry) => {
				const agent = normalizeAgentConfig(entry);
				return agent ? [agent] : [];
			})
		: [];
	const bindings = Array.isArray(record?.bindings)
		? record.bindings.flatMap((entry) => {
				const binding = normalizeAgentRouteBinding(entry);
				return binding ? [binding] : [];
			})
		: [];
	return { agents, bindings };
}

export function resolveDefaultAgentId(
	settings?: Partial<AgentRoutingSettings>,
	fallbackAgentId = DEFAULT_AGENT_ID
): string {
	const agents = settings?.agents ?? [];
	return agents.find((agent) => agent.default)?.id ?? agents[0]?.id ?? fallbackAgentId;
}
