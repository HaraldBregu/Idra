import type { RankedTool, ToolPlan, ToolPlanStep, ToolSelectionDecision } from './types';

export interface ToolPlannerInput {
	goal: string;
	decision: ToolSelectionDecision;
	rankedTools: RankedTool[];
	maxSteps?: number;
}

export class ToolPlanner {
	createPlan(input: ToolPlannerInput): ToolPlan {
		const maxSteps = Math.max(1, Math.min(input.maxSteps ?? 4, 8));
		const toolIds = selectedToolIds(input.decision).slice(0, maxSteps);
		const steps: ToolPlanStep[] = [];
		const seen = new Set<string>();
		for (const toolId of toolIds) {
			if (seen.has(toolId)) continue;
			seen.add(toolId);
			const ranked = input.rankedTools.find((entry) => entry.tool.id === toolId);
			if (!ranked) continue;
			steps.push({
				id: `step-${steps.length + 1}`,
				toolId,
				purpose: ranked.tool.description,
				inputDependencies: steps.length === 0 ? [] : [`step-${steps.length}`],
				expectedOutputs: [`validated ${ranked.tool.category} result from ${ranked.tool.name}`],
				stopConditions: ['required output obtained', 'tool reports non-retryable failure', 'user clarification is required'],
				fallbackToolIds: input.rankedTools
					.filter((entry) => entry.tool.id !== toolId && entry.tool.category === ranked.tool.category)
					.slice(0, 2)
					.map((entry) => entry.tool.id),
			});
		}
		return {
			goal: input.goal,
			steps,
			maxSteps,
			stopConditions: ['answer can be completed', 'safety or permission boundary is reached', 'max steps reached'],
		};
	}
}

function selectedToolIds(decision: ToolSelectionDecision): string[] {
	if (decision.type === 'useTool') return [decision.toolId];
	if (decision.type === 'useMultipleTools') return decision.toolIds;
	return [];
}

