import type { SkillExecutionEngine } from './execution-engine';
import type { SkillExecutionRequestContext, SkillResult } from '../core/types';

export interface SkillWorkflowStep {
	id: string;
	skillId: string;
	version?: string;
	input: unknown | ((previous: SkillResult[]) => unknown);
	dependsOn?: string[];
	fallbacks?: Array<{ skillId: string; version?: string; input?: unknown }>;
}

export interface SkillWorkflow {
	id: string;
	steps: SkillWorkflowStep[];
	maxDepth?: number;
}

export class SkillComposer {
	constructor(private readonly engine: SkillExecutionEngine) {}

	validate(workflow: SkillWorkflow): void {
		const seen = new Set<string>();
		const visiting = new Set<string>();
		const byId = new Map(workflow.steps.map((step) => [step.id, step]));

		const visit = (id: string, depth: number): void => {
			if (depth > (workflow.maxDepth ?? 8)) throw new Error(`Workflow depth exceeded: ${workflow.id}`);
			if (visiting.has(id)) throw new Error(`Cyclic skill workflow dependency: ${id}`);
			if (seen.has(id)) return;
			const step = byId.get(id);
			if (!step) throw new Error(`Unknown workflow step dependency: ${id}`);
			visiting.add(id);
			for (const dependency of step.dependsOn ?? []) visit(dependency, depth + 1);
			visiting.delete(id);
			seen.add(id);
		};

		for (const step of workflow.steps) visit(step.id, 0);
	}

	async execute(workflow: SkillWorkflow, context: SkillExecutionRequestContext): Promise<SkillResult[]> {
		this.validate(workflow);
		const completed = new Map<string, SkillResult>();
		const results: SkillResult[] = [];

		for (const step of workflow.steps) {
			const dependencies = step.dependsOn ?? [];
			const failedDependency = dependencies.find((id) => completed.get(id)?.success === false);
			if (failedDependency) continue;
			const input = typeof step.input === 'function' ? step.input(results) : step.input;
			let result = await this.engine.execute({
				skillId: step.skillId,
				version: step.version,
				input,
				context,
			});
			if (!result.success) {
				for (const fallback of step.fallbacks ?? []) {
					result = await this.engine.execute({
						skillId: fallback.skillId,
						version: fallback.version,
						input: fallback.input ?? input,
						context,
					});
					if (result.success) break;
				}
			}
			completed.set(step.id, result);
			results.push(result);
		}

		return results;
	}
}
