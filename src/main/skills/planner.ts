import { randomUUID } from 'node:crypto';
import type {
	SkillCostEstimate,
	SkillExecutionPlan,
	SkillLatencyEstimate,
	SkillPlanStep,
	SkillSelectionDecision,
} from '../core/types';

function addCost(left: SkillCostEstimate, right: SkillCostEstimate): SkillCostEstimate {
	return { amount: left.amount + right.amount, unit: left.unit };
}

function addLatency(left: SkillLatencyEstimate, right: SkillLatencyEstimate): SkillLatencyEstimate {
	return {
		p50Ms: left.p50Ms + right.p50Ms,
		p95Ms: (left.p95Ms ?? left.p50Ms) + (right.p95Ms ?? right.p50Ms),
	};
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
