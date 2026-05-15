import type {
	SkillContext,
	SkillDiscoveryCandidate,
	SkillDiscoveryResult,
	SkillExecutionRequestContext,
	SkillUserPreferences,
} from './types';
import type { SkillRegistry } from './registry';
import type { SkillRanker } from './ranker';
import type { SkillSafetyPolicy } from './safety-policy';

export interface SkillDiscoveryOptions {
	maxResults?: number;
	includeInternal?: boolean;
}

export class SkillDiscovery {
	constructor(
		private readonly registry: SkillRegistry,
		private readonly ranker: SkillRanker,
		private readonly safetyPolicy: SkillSafetyPolicy
	) {}

	async discover(
		query: string,
		context: Omit<SkillContext, 'intent' | 'now'>,
		executionContext: SkillExecutionRequestContext,
		options: SkillDiscoveryOptions = {}
	): Promise<SkillDiscoveryResult> {
		const skillContext: SkillContext = {
			...context,
			intent: query,
			now: new Date(),
		};
		const filtered: SkillDiscoveryResult['filtered'] = [];
		const candidates: SkillDiscoveryCandidate[] = [];
		const skills = this.registry.listSkills();

		for (const skill of skills) {
			if (!options.includeInternal && skill.visibility === 'internal') {
				filtered.push({ skillId: skill.id, version: skill.version, reason: 'internal' });
				continue;
			}

			const safety = await this.safetyPolicy.checkBeforeExecution(skill, { intent: query }, executionContext);
			if (!safety.allowed) {
				filtered.push({ skillId: skill.id, version: skill.version, reason: safety.reasons.join('; ') });
				continue;
			}

			const capability = await skill.canHandle(skillContext);
			if (!capability.canHandle || capability.confidence <= 0) {
				filtered.push({ skillId: skill.id, version: skill.version, reason: 'intent_mismatch' });
				continue;
			}

			const ranking = this.ranker.rank(skill, skillContext, capability.confidence);
			candidates.push({ skill, capability, ranking });
		}

		candidates.sort((a, b) => b.ranking.score - a.ranking.score);
		return {
			query,
			candidates: candidates.slice(0, options.maxResults ?? 8),
			filtered,
			totalAvailable: skills.length,
			generatedAt: new Date().toISOString(),
		};
	}
}

export function makeDiscoveryContext(input: {
	userId: string;
	sessionId: string;
	availableTools: string[];
	availableConnectors: string[];
	permissions: string[];
	availableMemoryKinds?: string[];
	userPreferences: SkillUserPreferences;
	priorSuccessRate?: ReadonlyMap<string, number>;
	parentSkillId?: string;
	skillDepth?: number;
}): Omit<SkillContext, 'intent' | 'now'> {
	return {
		userId: input.userId,
		sessionId: input.sessionId,
		availableTools: new Set(input.availableTools),
		availableConnectors: new Set(input.availableConnectors),
		permissions: new Set(input.permissions),
		availableMemoryKinds: new Set(input.availableMemoryKinds ?? []),
		userPreferences: input.userPreferences,
		priorSuccessRate: input.priorSuccessRate ?? new Map(),
		parentSkillId: input.parentSkillId,
		skillDepth: input.skillDepth ?? 0,
		provenanceChain: [],
	};
}
