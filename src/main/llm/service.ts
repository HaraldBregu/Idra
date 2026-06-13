import { Service } from 'typedi';
import { ModelSdk, type ModelSdkOptions } from './model-sdk';
import type { ProviderAdapter, ProviderSpec } from './types';

export type LlmServiceOptions = Omit<ModelSdkOptions, 'provider'>;

@Service()
export class LlmService {
	constructor(private readonly options: LlmServiceOptions = {}) {}

	build(provider: ProviderSpec): ProviderAdapter {
		return new ModelSdk({
			provider,
			...this.options,
		});
	}
}
