import type { AgentTool } from '../../tools/types';
import type { SkillPromptChoice } from '../core/types';

export type SkillRuntimeMode = 'prompt-tool';

export interface SkillRuntimePlan {
	providerId: string;
	mode: SkillRuntimeMode;
	promptSkills: ReadonlyArray<SkillPromptChoice>;
	fileBackedSkills: ReadonlyArray<SkillPromptChoice>;
	executableSkills: ReadonlyArray<SkillPromptChoice>;
	requiredToolNames: ReadonlyArray<string>;
	needsReadTool: boolean;
	needsExecutionTool: boolean;
}

export interface SkillRuntimePlanningInput {
	providerId: string;
	skills: ReadonlyArray<SkillPromptChoice>;
}

export interface SkillRuntimeStrategy {
	readonly mode: SkillRuntimeMode;
	canPlan(providerId: string): boolean;
	plan(input: SkillRuntimePlanningInput): SkillRuntimePlan;
}

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase() || 'unknown';
}

function unique(values: ReadonlyArray<string>): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const normalized = value.trim();
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		out.push(normalized);
	}
	return out;
}

function declaredToolNames(skills: ReadonlyArray<SkillPromptChoice>): string[] {
	return unique(skills.flatMap((skill) => [...skill.requiredTools, ...(skill.allowedTools ?? [])]));
}

export class PromptToolSkillRuntimeStrategy implements SkillRuntimeStrategy {
	readonly mode = 'prompt-tool' as const;

	canPlan(_providerId: string): boolean {
		return true;
	}

	plan(input: SkillRuntimePlanningInput): SkillRuntimePlan {
		const providerId = normalizeProviderId(input.providerId);
		const promptSkills = [...input.skills];
		const fileBackedSkills = promptSkills.filter((skill) => Boolean(skill.path));
		const executableSkills = promptSkills.filter((skill) => !skill.path);
		const needsReadTool = fileBackedSkills.length > 0;
		const requiredToolNames = unique([
			...declaredToolNames(promptSkills),
			...(needsReadTool ? ['read'] : []),
		]);

		return {
			providerId,
			mode: this.mode,
			promptSkills,
			fileBackedSkills,
			executableSkills,
			requiredToolNames,
			needsReadTool,
			needsExecutionTool: executableSkills.length > 0,
		};
	}
}

const DEFAULT_STRATEGIES: ReadonlyArray<SkillRuntimeStrategy> = [
	new PromptToolSkillRuntimeStrategy(),
];

export function createSkillRuntimePlan(
	input: SkillRuntimePlanningInput,
	strategies: ReadonlyArray<SkillRuntimeStrategy> = DEFAULT_STRATEGIES
): SkillRuntimePlan {
	const providerId = normalizeProviderId(input.providerId);
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
