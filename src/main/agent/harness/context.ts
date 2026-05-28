import type { AgentHarnessContextBuildResult, AgentHarnessContextManager, AgentHarnessMemoryRecord, AgentHarnessSession } from './types';

export class BudgetedAgentHarnessContextManager implements AgentHarnessContextManager {
	constructor(private readonly options: { maxHistoryMessages?: number; defaultBudgetTokens?: number } = {}) {}
	async build(input: { task: string; session: AgentHarnessSession; memory: AgentHarnessMemoryRecord[]; budgetTokens?: number }): Promise<AgentHarnessContextBuildResult> {
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
