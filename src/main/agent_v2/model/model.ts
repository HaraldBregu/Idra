import type { ModelModule, ModelRequest, ModelResponse, StatelessLlm } from './types';

export class AgentModel implements ModelModule {
	constructor(private readonly llm: StatelessLlm) {}

	generate(request: ModelRequest): Promise<ModelResponse> {
		return this.llm.generate(request);
	}
}
