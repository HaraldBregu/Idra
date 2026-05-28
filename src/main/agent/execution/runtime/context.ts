import type { AgentRuntimeContextBuildResult, AgentRuntimeContextManager, AgentRuntimeMemoryRecord, AgentRuntimeSession } from './types';

export class BudgetedAgentRuntimeContextManager implements AgentRuntimeContextManager {
	constructor(private readonly options: { maxHistoryMessages?: number; defaultBudgetTokens?: number } = {}) {}
	async build(input: { task: string; session: AgentRuntimeSession; memory: AgentRuntimeMemoryRecord[]; budgetTokens?: number }): Promise<AgentRuntimeContextBuildResult> {
		const limit = this.options.maxHistoryMessages ?? 20;
		const messages = input.session.transcript.slice(-limit);
		return {
			messages,
			systemPromptAdditions: [],
			metadata: {},
			trace: {
				budgetTokens: input.budgetTokens ?? this.options.defaultBudgetTokens ?? 12_000,
				estimatedTokens: input.task.length / 4,
				included: [`history:${messages.length}`, `memory:${input.memory.length}`],
				dropped: input.session.transcript.length > messages.length ? [`history:${input.session.transcript.length - messages.length}`] : [],
				summarized: [],
			},
		};
	}
}
