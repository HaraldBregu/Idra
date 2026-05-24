import type { AgentTool } from '../../tools/types';
import type { SkillPromptChoice } from '../core/types';

export type SkillRuntimeMode = 'prompt-tool';

export interface SkillRuntimePlan {
	providerId: string;
	mode: SkillRuntimeMode;
	promptSkills: SkillPromptChoice[];
	fileBackedSkills: SkillPromptChoice[];
	executableSkills: SkillPromptChoice[];
	requiredToolNames: string[];
	needsReadTool: boolean;
	needsExecutionTool: boolean;
}

export interface SkillRuntimePlanningInput {
	providerId: string;
	skills: SkillPromptChoice[];
}

export interface SkillRuntimeStrategy {
	readonly mode: SkillRuntimeMode;
	canPlan(providerId: string): boolean;
	plan(input: SkillRuntimePlanningInput): SkillRuntimePlan;
}

function unique(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)));
}

function declaredToolNames(skills: SkillPromptChoice[]): string[] {
	return unique(skills.flatMap((skill) => [...skill.requiredTools, ...(skill.allowedTools ?? [])]));
}

export class PromptToolSkillRuntimeStrategy implements SkillRuntimeStrategy {
	readonly mode = 'prompt-tool' as const;

	canPlan(_providerId: string): boolean {
		return true;
	}

	plan(input: SkillRuntimePlanningInput): SkillRuntimePlan {
		const providerId = input.providerId.trim().toLowerCase() || 'unknown';
		const fileBackedSkills = input.skills.filter((skill) => Boolean(skill.path));
		const executableSkills = input.skills.filter((skill) => !skill.path);
		const needsReadTool = fileBackedSkills.length > 0;
		const requiredToolNames = unique([
			...declaredToolNames(input.skills),
			...(needsReadTool ? ['read'] : []),
		]);

		return {
			providerId,
			mode: this.mode,
			promptSkills: input.skills,
			fileBackedSkills,
			executableSkills,
			requiredToolNames,
			needsReadTool,
			needsExecutionTool: executableSkills.length > 0,
		};
	}
}

const DEFAULT_STRATEGIES: SkillRuntimeStrategy[] = [new PromptToolSkillRuntimeStrategy()];

export function createSkillRuntimePlan(
	input: SkillRuntimePlanningInput,
	strategies: SkillRuntimeStrategy[] = DEFAULT_STRATEGIES
): SkillRuntimePlan {
	const providerId = input.providerId.trim().toLowerCase() || 'unknown';
	const strategy = strategies.find((candidate) => candidate.canPlan(providerId));
	if (!strategy) {
		throw new Error(`No skill runtime strategy available for provider: ${providerId}`);
	}
	return strategy.plan({ ...input, providerId });
}

export function selectToolsForSkillRuntime(input: {
	baseTools: AgentTool[];
	selectedTools: AgentTool[];
	plan: SkillRuntimePlan;
}): AgentTool[] {
	const selected = [...input.selectedTools];
	const selectedNames = new Set(selected.map((tool) => tool.name));
	const requiredNames = new Set(input.plan.requiredToolNames);

	for (const tool of input.baseTools) {
		if (!requiredNames.has(tool.name) || selectedNames.has(tool.name)) continue;
		selected.push(tool);
		selectedNames.add(tool.name);
	}

	return selected;
}
