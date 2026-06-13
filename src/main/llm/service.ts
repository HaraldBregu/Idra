import { Service } from 'typedi';
import { ModeSdk, type ModeSdkOptions } from './mode-sdk';
import type { ProviderAdapter, ProviderSpec } from './types';

export type LlmServiceOptions = Omit<ModeSdkOptions, 'provider'>;

@Service()
export class LlmService {
	constructor(private readonly options: LlmServiceOptions = {}) {}

	build(provider: ProviderSpec): ProviderAdapter {
		return new ModeSdk({
			provider,
			...this.options,
		});
	}
}
