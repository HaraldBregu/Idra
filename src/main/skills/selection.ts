import { randomUUID } from 'node:crypto';
import type {
	SkillCostEstimate,
	SkillContext,
	SkillDefinition,
	SkillDiscoveryCandidate,
	SkillDiscoveryResult,
	SkillExecutionPlan,
	SkillExecutionRequestContext,
	SkillLatencyEstimate,
	SkillPlanStep,
	SkillRanking,
	SkillSelectionDecision,
	SkillUserPreferences,
} from './types';
import type { SkillRegistry } from './catalog';
import type { SkillSafetyPolicy } from './file_runtime';

export interface SkillDiscoveryOptions {
	maxResults?: number;
	includeInternal?: boolean;
}

function disablesModelInvocation(metadata: Record<string, unknown>): boolean {
	return metadata.disableModelInvocation === true;
}

function tokenize(value: string): Set<string> {
	return new Set(
		value
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((item) => item.length > 2)
	);
}

function overlap(left: Set<string>, right: Set<string>): number {
	if (left.size === 0 || right.size === 0) return 0;
	let hits = 0;
	for (const token of left) {
		if (right.has(token)) hits++;
	}
	return hits / left.size;
}

function skillText(skill: SkillDefinition): string {
	return [
		skill.id,
		skill.name,
		skill.description,
		skill.category,
		...skill.tags,
		...skill.examples.map((example) => example.description ?? ''),
	].join(' ');
}

function addCost(left: SkillCostEstimate, right: SkillCostEstimate): SkillCostEstimate {
	return { amount: left.amount + right.amount, unit: left.unit };
}

function addLatency(left: SkillLatencyEstimate, right: SkillLatencyEstimate): SkillLatencyEstimate {
	return {
		p50Ms: left.p50Ms + right.p50Ms,
		p95Ms: (left.p95Ms ?? left.p50Ms) + (right.p95Ms ?? right.p50Ms),
	};
}

export class SkillRanker {
	rank(skill: SkillDefinition, context: SkillContext, capabilityConfidence: number): SkillRanking {
		const queryTokens = tokenize(context.intent);
		const skillTokens = tokenize(skillText(skill));
		const intentMatch = overlap(queryTokens, skillTokens);
		const preferred = context.userPreferences.preferredSkills.includes(skill.id) ? 1 : 0;
		const avoided = context.userPreferences.avoidedSkills.includes(skill.id) ? 1 : 0;
		const priorSuccess = context.priorSuccessRate.get(skill.id) ?? 0.5;
		const latencyScore = 1 / (1 + skill.estimatedLatency.p50Ms / 10_000);
		const costScore = 1 / (1 + skill.estimatedCost.amount);
		const safetyScore =
			skill.safetyLevel === 'low'
				? 1
				: skill.safetyLevel === 'medium'
					? 0.8
					: skill.safetyLevel === 'high'
						? 0.55
						: 0.25;
		const permissionScore = skill.permissionsRequired.length === 0 ? 1 : 0.8;
		const freshness = typeof skill.metadata.freshnessScore === 'number' ? skill.metadata.freshnessScore : 0.5;

		const factors = {
			intentMatch,
			capability: capabilityConfidence,
			preferred,
			avoidedPenalty: avoided,
			priorSuccess,
			latency: latencyScore,
			cost: costScore,
			safety: safetyScore,
			reliability: skill.reliabilityScore,
			freshness,
			permission: permissionScore,
		};
		const score =
			intentMatch * 0.28 +
			capabilityConfidence * 0.2 +
			skill.reliabilityScore * 0.13 +
			priorSuccess * 0.1 +
			preferred * 0.1 +
			latencyScore * 0.06 +
			costScore * 0.04 +
			safetyScore * 0.05 +
			freshness * 0.03 +
			permissionScore * 0.01 -
			avoided * 0.35;

		const reasons = [
			`intent=${intentMatch.toFixed(2)}`,
			`capability=${capabilityConfidence.toFixed(2)}`,
			`reliability=${skill.reliabilityScore.toFixed(2)}`,
		];

		return { skill, score, factors, reasons };
	}
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
			if (disablesModelInvocation(skill.metadata)) {
				filtered.push({ skillId: skill.id, version: skill.version, reason: 'model_invocation_disabled' });
				continue;
			}

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

const UNSAFE_INTENT = /\b(steal|exfiltrate|bypass|malware|credential theft|phishing)\b/i;

export class SkillSelector {
	select(discovery: SkillDiscoveryResult): SkillSelectionDecision {
		if (UNSAFE_INTENT.test(discovery.query)) {
			return { kind: 'refuseSafely', reason: 'The request appears unsafe for skill execution.' };
		}

		if (discovery.candidates.length === 0) {
			return { kind: 'answerDirectly', reason: 'No relevant authorized skill was found.' };
		}

		const [top, second] = discovery.candidates;
		if (top && second && Math.abs(top.ranking.score - second.ranking.score) < 0.03) {
			return {
				kind: 'askClarifyingQuestion',
				question: `Should I use ${top.skill.name} or ${second.skill.name}?`,
				candidates: [top, second],
			};
		}

		const multiStepIntent = /\b(and then|then|after that|workflow|compose|draft|email|report)\b/i.test(
			discovery.query
		);
		if (multiStepIntent && discovery.candidates.length > 1) {
			return {
				kind: 'useMultipleSkills',
				skills: discovery.candidates.slice(0, 3),
				reason: 'The request appears to need multiple reusable capabilities.',
			};
		}

		return { kind: 'useSkill', skill: top, reason: 'Top ranked skill is sufficiently specific.' };
	}
}

export class SkillPlanner {
	createPlan(goal: string, decision: SkillSelectionDecision): SkillExecutionPlan {
		const selected =
			decision.kind === 'useSkill'
				? [decision.skill]
				: decision.kind === 'useMultipleSkills'
					? decision.skills
					: [];
		const steps: SkillPlanStep[] = selected.map((candidate, index) => ({
			id: `step-${index + 1}`,
			skillId: candidate.skill.id,
			version: candidate.skill.version,
			subgoal: candidate.skill.description,
			dependsOn: index === 0 ? [] : [`step-${index}`],
		}));
		const zeroCost: SkillCostEstimate = { amount: 0, unit: 'abstract' };
		const zeroLatency: SkillLatencyEstimate = { p50Ms: 0, p95Ms: 0 };
		const totalCost = selected.reduce<SkillCostEstimate>(
			(total, candidate) => addCost(total, candidate.skill.estimatedCost),
			zeroCost
		);
		const totalLatency = selected.reduce<SkillLatencyEstimate>(
			(total, candidate) => addLatency(total, candidate.skill.estimatedLatency),
			zeroLatency
		);

		return {
			id: randomUUID(),
			goal,
			subgoals: steps.map((step) => step.subgoal),
			selectedSkills: selected.map((candidate) => ({
				skillId: candidate.skill.id,
				version: candidate.skill.version,
			})),
			executionOrder: steps,
			dependencies: steps.slice(1).map((step, index) => ({
				fromStepId: `step-${index + 1}`,
				toStepId: step.id,
				reason: 'Sequential workflow dependency',
			})),
			requiredPermissions: Array.from(
				new Set(selected.flatMap((candidate) => candidate.skill.permissionsRequired))
			),
			stopConditions: ['user cancellation', 'permission denial', 'safety policy denial'],
			fallbackPlans: [],
			estimatedCost: totalCost,
			estimatedLatency: totalLatency,
			createdAt: new Date().toISOString(),
		};
	}
}
