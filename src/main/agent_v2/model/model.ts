import type { CoreModule, CoreRequest, CoreResponse, StatelessLlm } from './types';

export class AgentCore implements CoreModule {
	constructor(private readonly llm: StatelessLlm) {}

	generate(request: CoreRequest): Promise<CoreResponse> {
		return this.llm.generate(request);
	}
}
