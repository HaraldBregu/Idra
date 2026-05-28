import type { SkillContext, SkillDefinition, SkillRanking } from '../core/types';

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
