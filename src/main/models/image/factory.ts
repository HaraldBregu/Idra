import { Service } from 'typedi';
import { normalizeProviderId } from '../../../shared/provider_models_definitions';
import { createBflImageAdapter } from './providers/bfl';
import { createGoogleImageAdapter } from './providers/google';
import { createIdeogramImageAdapter } from './providers/ideogram';
import { createLumaImageAdapter } from './providers/luma';
import { createQwenImageAdapter } from './providers/qwen';
import { createStabilityImageAdapter } from './providers/stability';
import { createXaiImageAdapter } from './providers/xai';
import { ImageProviderUnsupportedError } from './errors';
import type { ImageAdapter, ImageProviderSpec } from './types';

@Service()
export class ImageAdapterFactory {
	build(provider: ImageProviderSpec): ImageAdapter {
		const id = normalizeProviderId(provider.id);
		const spec = { ...provider, id };
		if (id === 'black-forest-labs') return createBflImageAdapter(spec);
		if (id === 'google') return createGoogleImageAdapter(spec);
		if (id === 'ideogram') return createIdeogramImageAdapter(spec);
		if (id === 'luma') return createLumaImageAdapter(spec);
		if (id === 'qwen') return createQwenImageAdapter(spec);
		if (id === 'stability-ai') return createStabilityImageAdapter(spec);
		if (id === 'xai') return createXaiImageAdapter(spec);
		if (id === 'midjourney') {
			throw new ImageProviderUnsupportedError('Midjourney does not expose a public API.');
		}
		throw new ImageProviderUnsupportedError(`Text-to-image provider is not supported: ${id}`);
	}
}
