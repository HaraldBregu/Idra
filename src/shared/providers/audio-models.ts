import { model, type ModelCatalog } from './models';

export const TEXT_TO_AUDIO_MODELS_BY_PROVIDER = {
	elevenlabs: [
		model('eleven-music', 'Eleven Music'),
		model('elevenlabs-sound-effects', 'ElevenLabs Sound Effects'),
	],
	google: [
		model('lyria-3-pro-preview', 'Lyria 3 Pro Preview'),
		model('lyria-3-clip-preview', 'Lyria 3 Clip Preview'),
		model('lyria-realtime', 'Lyria Realtime'),
	],
	kling: [model('kling-audio', 'Kling Audio')],
	minimax: [model('music-2.6', 'Music 2.6'), model('music-cover', 'Music Cover')],
	'stability-ai': [model('stable-audio-2.5', 'Stable Audio 2.5')],
	suno: [model('suno-v5.5', 'Suno v5.5'), model('suno-v4.5-all', 'Suno v4.5 All')],
} as const satisfies ModelCatalog;

export const MUSIC_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_AUDIO_MODELS_BY_PROVIDER;
export const MUSIC_MODELS_BY_PROVIDER = TEXT_TO_AUDIO_MODELS_BY_PROVIDER;
export const MUSIC_CREATOR_MODELS = TEXT_TO_AUDIO_MODELS_BY_PROVIDER.google;
export const MUSIC_PROVIDER_IDS = [
	'elevenlabs',
	'google',
	'kling',
	'minimax',
	'stability-ai',
	'suno',
] as const;
