import { model, type ModelCatalog } from './models';

export const TEXT_TO_VIDEO_MODELS_BY_PROVIDER = {
	google: [model('veo-3.1', 'Veo 3.1'), model('veo-3.1-fast', 'Veo 3.1 Fast')],
	kling: [model('kling-2.6', 'Kling 2.6'), model('kling-2.1', 'Kling 2.1')],
	luma: [model('ray3.14', 'Ray 3.14'), model('ray3', 'Ray 3'), model('ray2', 'Ray 2')],
	meta: [model('movie-gen-video', 'Movie Gen Video')],
	midjourney: [model('midjourney-video', 'Midjourney Video')],
	minimax: [
		model('MiniMax-Hailuo-2.3', 'MiniMax Hailuo 2.3'),
		model('MiniMax-Hailuo-2.3-Fast', 'MiniMax Hailuo 2.3 Fast'),
		model('MiniMax-Hailuo-02', 'MiniMax Hailuo 02'),
	],
	pika: [
		model('pika-2.5', 'Pika 2.5'),
		model('pika-pro', 'Pika Pro'),
		model('pika-turbo', 'Pika Turbo'),
	],
	qwen: [
		model('wan2.7-t2v', 'Wan 2.7 Text-to-Video'),
		model('wan2.7-i2v', 'Wan 2.7 Image-to-Video'),
		model('wan2.7-video-edit', 'Wan 2.7 Video Edit'),
	],
	runway: [
		model('gen4.5', 'Gen 4.5'),
		model('gen4_turbo', 'Gen 4 Turbo'),
		model('gen4_aleph', 'Gen 4 Aleph'),
	],
	'stability-ai': [model('stable-video', 'Stable Video')],
	xai: [model('grok-imagine-video', 'Grok Imagine Video')],
} as const satisfies ModelCatalog;

export const VIDEO_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_VIDEO_MODELS_BY_PROVIDER;
export const TEXT_TO_VIDEO_MODELS = TEXT_TO_VIDEO_MODELS_BY_PROVIDER.google;
export const TEXT_TO_VIDEO_PROVIDER_IDS = [
	'google',
	'kling',
	'luma',
	'meta',
	'midjourney',
	'minimax',
	'pika',
	'qwen',
	'runway',
	'stability-ai',
	'xai',
] as const;
