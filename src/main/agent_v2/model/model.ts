import type { ModelModule, ModelRequest, ModelResponse, StatelessModel } from './types';

export class AgentModel implements ModelModule {
	constructor(private readonly model: StatelessModel) {}

	generate(request: ModelRequest): Promise<ModelResponse> {
		return this.model.generate(request);
	}
}
