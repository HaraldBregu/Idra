import type { Provider } from '../../shared/providers';
import type { TextToImageAdapter } from './types';

export interface TextToImageAdapterRegistry {
	resolve(provider: Provider, modelId: string): TextToImageAdapter | undefined;
	has(provider: Provider, modelId: string): boolean;
}

export type TextToImageAdapterFactory = (input: {
	provider: Provider;
	modelId: string;
}) => TextToImageAdapter | undefined;

export function createTextToImageAdapterRegistry(
	factories: readonly TextToImageAdapterFactory[] = []
): TextToImageAdapterRegistry {
	return {
		resolve(provider, modelId) {
			for (const factory of factories) {
				const adapter = factory({ provider, modelId });
				if (adapter) return adapter;
			}
			return undefined;
		},
		has(provider, modelId) {
			return Boolean(this.resolve(provider, modelId));
		},
	};
}

export const EMPTY_TEXT_TO_IMAGE_ADAPTER_REGISTRY = createTextToImageAdapterRegistry();
