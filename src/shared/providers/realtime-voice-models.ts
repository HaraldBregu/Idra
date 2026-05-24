import { model, normalizeProviderId, type ModelCatalog } from './models';

export const REALTIME_VOICE_MODELS_BY_PROVIDER = {
	google: [model('gemini-3.1-flash-live-preview', 'Gemini 3.1 Flash Live Preview')],
	luma: [model('uni-1.1', 'Uni 1.1')],
	qwen: [
		model('qwen-omni-realtime', 'Qwen Omni Realtime'),
		model('qwen3.5-omni', 'Qwen3.5 Omni'),
		model('qwen3-omni-flash', 'Qwen3 Omni Flash'),
	],
	xai: [model('grok-voice-latest', 'Grok Voice Latest')],
} as const satisfies ModelCatalog;
