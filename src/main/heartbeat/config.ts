import { DEFAULT_AGENT_ID } from '../constants';
import type { OperatorStoreState } from '../../shared/agents/service';
import type { AgentHeartbeatConfig, AgentsHeartbeatConfig } from '../../shared/heartbeat';
import { parseHeartbeatDurationMs } from './duration';

export const DEFAULT_HEARTBEAT_EVERY = '30m';
export const DEFAULT_HEARTBEAT_TARGET = 'none';
export const DEFAULT_HEARTBEAT_ACK_MAX_CHARS = 300;
export const HEARTBEAT_PROMPT =
	'Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.';

export interface HeartbeatSummary {
	agentId: string;
	enabled: boolean;
	every: string;
	everyMs: number | null;
	prompt: string;
	target: string;
	model?: string;
	session?: string;
	directPolicy: 'allow' | 'block';
	to?: string;
	accountId?: string;
	activeHours?: AgentHeartbeatConfig['activeHours'];
	includeSystemPromptSection: boolean;
	ackMaxChars: number;
	suppressToolErrorWarnings: boolean;
	timeoutSeconds?: number;
	lightContext: boolean;
	isolatedSession: boolean;
	skipWhenBusy: boolean;
	includeReasoning: boolean;
	raw: AgentHeartbeatConfig;
}

function operatorAgents(operator?: OperatorStoreState): AgentsHeartbeatConfig {
	return operator?.agents ?? {};
}

export function resolveDefaultHeartbeatAgentId(operator?: OperatorStoreState): string {
	return operatorAgents(operator).defaultAgentId?.trim() || DEFAULT_AGENT_ID;
}

function hasExplicitHeartbeatAgents(agents: AgentsHeartbeatConfig): boolean {
	return (agents.list ?? []).some((entry) => Boolean(entry.heartbeat));
}

function mergeHeartbeatConfig(
	defaults?: AgentHeartbeatConfig,
	override?: AgentHeartbeatConfig
): AgentHeartbeatConfig {
	return { ...(defaults ?? {}), ...(override ?? {}) };
}

function normalizeOptionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function resolveHeartbeatIntervalMs(config: AgentHeartbeatConfig | undefined): number | null {
	const every = normalizeOptionalString(config?.every ?? DEFAULT_HEARTBEAT_EVERY);
	return parseHeartbeatDurationMs(every, 'm');
}

export function resolveHeartbeatPrompt(raw?: string): string {
	return normalizeOptionalString(raw) ?? HEARTBEAT_PROMPT;
}

export function resolveHeartbeatSummaryForAgent(
	operator: OperatorStoreState | undefined,
	agentId = resolveDefaultHeartbeatAgentId(operator)
): HeartbeatSummary {
	const agents = operatorAgents(operator);
	const defaults = agents.defaults?.heartbeat;
	const listEntry = (agents.list ?? []).find((entry) => entry.id === agentId);
	const explicit = hasExplicitHeartbeatAgents(agents);
	const enabled = explicit ? Boolean(listEntry?.heartbeat) : true;
	const merged = mergeHeartbeatConfig(defaults, listEntry?.heartbeat);
	const every = normalizeOptionalString(merged.every) ?? DEFAULT_HEARTBEAT_EVERY;
	const everyMs = enabled ? resolveHeartbeatIntervalMs({ ...merged, every }) : null;
	const ackMaxChars =
		typeof merged.ackMaxChars === 'number' && Number.isFinite(merged.ackMaxChars)
			? Math.max(0, Math.floor(merged.ackMaxChars))
			: DEFAULT_HEARTBEAT_ACK_MAX_CHARS;

	return {
		agentId,
		enabled,
		every,
		everyMs,
		prompt: resolveHeartbeatPrompt(merged.prompt),
		target: normalizeOptionalString(merged.target) ?? DEFAULT_HEARTBEAT_TARGET,
		model: normalizeOptionalString(merged.model),
		session: normalizeOptionalString(merged.session),
		directPolicy: merged.directPolicy === 'block' ? 'block' : 'allow',
		to: normalizeOptionalString(merged.to),
		accountId: normalizeOptionalString(merged.accountId),
		activeHours: merged.activeHours,
		includeSystemPromptSection: merged.includeSystemPromptSection !== false,
		ackMaxChars,
		suppressToolErrorWarnings: merged.suppressToolErrorWarnings === true,
		timeoutSeconds:
			typeof merged.timeoutSeconds === 'number' && merged.timeoutSeconds > 0
				? merged.timeoutSeconds
				: undefined,
		lightContext: merged.lightContext === true,
		isolatedSession: merged.isolatedSession === true,
		skipWhenBusy: merged.skipWhenBusy === true,
		includeReasoning: merged.includeReasoning === true,
		raw: merged,
	};
}

export function resolveHeartbeatAgentSummaries(operator?: OperatorStoreState): HeartbeatSummary[] {
	const agents = operatorAgents(operator);
	const defaults = agents.defaults?.heartbeat;
	const list = agents.list ?? [];
	const explicit = hasExplicitHeartbeatAgents(agents);

	if (explicit) {
		return list
			.filter((entry) => entry.heartbeat)
			.map((entry) => resolveHeartbeatSummaryForAgent(operator, entry.id));
	}

	if (defaults) {
		const agentIds = list.length > 0 ? list.map((entry) => entry.id) : [resolveDefaultHeartbeatAgentId(operator)];
		return agentIds.map((agentId) => resolveHeartbeatSummaryForAgent(operator, agentId));
	}

	return [resolveHeartbeatSummaryForAgent(operator, resolveDefaultHeartbeatAgentId(operator))];
}

export function isHeartbeatSystemPromptEnabled(operator: OperatorStoreState | undefined, agentId: string): boolean {
	const summary = resolveHeartbeatSummaryForAgent(operator, agentId);
	return (
		agentId === resolveDefaultHeartbeatAgentId(operator) &&
		summary.enabled &&
		(summary.everyMs ?? 0) > 0 &&
		summary.includeSystemPromptSection
	);
}
