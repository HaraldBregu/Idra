import { Service } from 'typedi';
import { AgentModel, type AgentModelOptions } from './model';
import type { ProviderAdapter, ProviderSpec } from './types';

export type LlmServiceOptions = Omit<AgentModelOptions, 'provider'>;

@Service()
export class LlmService {
	constructor(private readonly options: LlmServiceOptions = {}) {}

	build(provider: ProviderSpec): ProviderAdapter {
		return new AgentModel({
			provider,
			...this.options,
		});
	}
}
