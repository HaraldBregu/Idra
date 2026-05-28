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
	const binding = value as AgentRouteBinding;
	return binding.agentId && binding.match ? binding : undefined;
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
