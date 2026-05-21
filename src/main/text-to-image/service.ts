import type { ModelModuleSettings } from '../store/types';
import type { StoreService } from '../store';
import { isAllowedImageCreatorModelForProvider } from '../../shared/service';
import type { Provider } from '../../shared/providers';
import {
	EMPTY_TEXT_TO_IMAGE_ADAPTER_REGISTRY,
	type TextToImageAdapterRegistry,
} from './adapters';
import type { TextToImageAdapter, TextToImageRequest, TextToImageResult } from './types';

interface TextToImageRuntime {
	settings: ModelModuleSettings;
	provider: Provider;
	adapter: TextToImageAdapter;
}

export interface TextToImageServiceOptions {
	adapters?: TextToImageAdapterRegistry;
}

function abortError(): Error {
	const error = new Error('Text-to-image request was cancelled.');
	error.name = 'AbortError';
	return error;
}

function normalizePrompt(prompt: string): string {
	const trimmed = prompt.trim();
	if (!trimmed) throw new Error('Prompt is required.');
	return trimmed;
}

export class TextToImageService {
	private readonly adapters: TextToImageAdapterRegistry;

	constructor(
		private readonly store: StoreService,
		options: TextToImageServiceOptions = {}
	) {
		this.adapters = options.adapters ?? EMPTY_TEXT_TO_IMAGE_ADAPTER_REGISTRY;
	}

	canCreateImages(): boolean {
		const settings = this.store.getImageCreatorSettings();
		if (!settings) return false;
		const provider = this.store.getProviderById(settings.providerId);
		if (!provider || !provider.apiKey.trim()) return false;
		if (!isAllowedImageCreatorModelForProvider(provider, settings.modelId)) return false;
		return this.adapters.has(provider, settings.modelId);
	}

	async create(request: TextToImageRequest, signal?: AbortSignal): Promise<TextToImageResult> {
		const runtime = this.requireRuntime();
		if (signal?.aborted) throw abortError();
		const prompt = normalizePrompt(request.prompt);
		const images = await runtime.adapter.create(
			{
				...request,
				prompt,
			},
			{
				provider: runtime.provider,
				modelId: runtime.settings.modelId,
				signal,
			}
		);
		if (signal?.aborted) throw abortError();
		if (images.length === 0) {
			throw new Error('The image provider returned no usable image assets.');
		}
		return {
			providerId: runtime.provider.id,
			modelId: runtime.settings.modelId,
			images: images.map((image) => ({
				...image,
				providerId: runtime.provider.id,
				modelId: runtime.settings.modelId,
			})),
		};
	}

	private requireRuntime(): TextToImageRuntime {
		const settings = this.store.getImageCreatorSettings();
		if (!settings) {
			throw new Error('Text-to-image module settings are not configured.');
		}

		const provider = this.store.getProviderById(settings.providerId);
		if (!provider) {
			throw new Error(`Saved text-to-image provider is missing: ${settings.providerId}`);
		}

		if (!isAllowedImageCreatorModelForProvider(provider, settings.modelId)) {
			throw new Error(`Saved model is not supported for text-to-image work: ${settings.modelId}`);
		}

		if (!provider.apiKey.trim()) {
			throw new Error(
				`Provider credentials are missing for text-to-image provider: ${provider.id}`
			);
		}

		const adapter = this.adapters.resolve(provider, settings.modelId);
		if (!adapter) {
			throw new Error(
				`No image adapter exists for provider "${provider.id}" and model "${settings.modelId}".`
			);
		}

		return {
			settings,
			provider,
			adapter,
		};
	}
}
