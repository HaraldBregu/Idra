import type { ModelClient } from '../model/model-client';
import type { AgentContext } from './agent-context';
import type { Message } from './messages';
import { query, type QueryEvent } from './query';

export type QueryEngineInput = {
	context: AgentContext;
	messages: Message[];
	systemPrompt: string;
	maxIterations?: number;
};

export class QueryEngine {
	constructor(private readonly model: ModelClient) {}

	run(input: QueryEngineInput): AsyncGenerator<QueryEvent, { reason: 'complete' | 'max_iterations'; messages: Message[] }> {
		return query({
			model: this.model,
			context: input.context,
			messages: input.messages,
			systemPrompt: input.systemPrompt,
			maxIterations: input.maxIterations,
		});
	}
}
