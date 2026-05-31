import { ToolRanker } from './ranker';
import {
	TOOL_PRIVACY_ORDER,
	TOOL_SAFETY_ORDER,
	type RankedTool,
	type RelevantMemory,
	type SessionContext,
	type Tool,
	type ToolCategory,
} from './types';
import type { ToolRegistry } from './registry';
import { TOOL_LIMITS } from '../limits';

export interface ToolDiscoveryInput {
	userIntent: string;
	sessionContext: SessionContext;
	memory?: RelevantMemory;
	topN?: number;
	categoryHint?: ToolCategory;
}

export class ToolDiscovery {
	constructor(
		private readonly registry: ToolRegistry,
		private readonly ranker = new ToolRanker()
	) {}

	discover(input: ToolDiscoveryInput): RankedTool[] {
		const topN = clampTopN(input.topN ?? TOOL_LIMITS.prompt.defaultMaxTools);
		const candidates = this.registry
			.listTools()
			.filter((tool) => tool.enabled)
			.filter((tool) => !input.categoryHint || tool.category === input.categoryHint)
			.filter((tool) => hasPermissions(tool, input.sessionContext.availablePermissions))
			.filter((tool) => passesSafety(tool, input.sessionContext))
			.filter((tool) => passesPrivacy(tool, input.sessionContext));
		return this.ranker
			.rank({
				userIntent: input.userIntent,
				sessionContext: input.sessionContext,
				memory: input.memory,
				tools: candidates,
			})
			.slice(0, topN);
	}
}

export function hasPermissions(tool: Tool, availablePermissions: ReadonlySet<string>): boolean {
	return tool.permissionsRequired.every(
		(permission) => availablePermissions.has(permission) || availablePermissions.has('*')
	);
}

function passesSafety(tool: Tool, sessionContext: SessionContext): boolean {
	const maxSafety = sessionContext.safetyConstraints?.maxSafetyLevel ?? 'high';
	return TOOL_SAFETY_ORDER[tool.safetyLevel] <= TOOL_SAFETY_ORDER[maxSafety];
}

function passesPrivacy(tool: Tool, sessionContext: SessionContext): boolean {
	const allowed = sessionContext.privacyConstraints?.allowedPrivacyLevels ?? [
		'public',
		'internal',
		'private',
	];
	const privacy = tool.metadata.privacyLevel ?? 'public';
	if (!allowed.includes(privacy)) return false;
	if (
		sessionContext.privacyConstraints?.disallowExternalPrivateData &&
		TOOL_PRIVACY_ORDER[privacy] >= TOOL_PRIVACY_ORDER.private
	) {
		return tool.category !== 'web' && tool.category !== 'search' && tool.category !== 'internalApi';
	}
	return true;
}

function clampTopN(topN: number): number {
	return Math.min(TOOL_LIMITS.prompt.hardMaxTools, Math.max(1, Math.floor(topN)));
}
