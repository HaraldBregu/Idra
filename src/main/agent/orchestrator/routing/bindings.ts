import { DEFAULT_AGENT_ID } from '../constants';
import type { AgentConfig, AgentRouteBinding, AgentRoutingSettings } from '../../../../shared/store';

export function resolveDefaultAgentId(settings?: Partial<AgentRoutingSettings>, fallbackAgentId = DEFAULT_AGENT_ID): string {
	return settings?.agents?.find((agent) => agent.default)?.id ?? settings?.agents?.[0]?.id ?? fallbackAgentId;
}

export function normalizeAgentConfig(value: unknown): AgentConfig | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	const id = typeof record.id === 'string' ? record.id.trim() : '';
	if (!id) return undefined;
	return { ...(record as unknown as AgentConfig), id };
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
