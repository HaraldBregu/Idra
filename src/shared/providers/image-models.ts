import { model, type ModelCatalog } from './models';

export const TEXT_TO_IMAGE_MODELS_BY_PROVIDER = {
	'black-forest-labs': [
		model('FLUX.2', 'FLUX.2'),
		model('FLUX.1 Kontext [pro]', 'FLUX.1 Kontext [pro]'),
		model('FLUX1.1 [pro] Ultra', 'FLUX1.1 [pro] Ultra'),
	],
	google: [
		model('gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image Preview'),
		model('gemini-3-pro-image-preview', 'Gemini 3 Pro Image Preview'),
	],
	ideogram: [model('ideogram-3.0', 'Ideogram 3.0'), model('ideogram-2a', 'Ideogram 2a')],
	luma: [model('uni-1.1', 'Uni 1.1')],
	midjourney: [
		model('midjourney-v8.1', 'Midjourney v8.1'),
		model('midjourney-v7', 'Midjourney v7'),
	],
	qwen: [model('qwen-image', 'Qwen Image'), model('qwen-image-edit', 'Qwen Image Edit')],
	'stability-ai': [
		model('stable-image-ultra', 'Stable Image Ultra'),
		model('stable-image-core', 'Stable Image Core'),
	],
	xai: [model('grok-imagine', 'Grok Imagine')],
} as const satisfies ModelCatalog;

export const IMAGE_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_IMAGE_MODELS_BY_PROVIDER;
export const IMAGE_CREATOR_MODELS = TEXT_TO_IMAGE_MODELS_BY_PROVIDER.google;
export const TEXT_TO_IMAGE_PROVIDER_IDS = [
	'black-forest-labs',
	'google',
	'ideogram',
	'luma',
	'midjourney',
	'qwen',
	'stability-ai',
	'xai',
] as const;
