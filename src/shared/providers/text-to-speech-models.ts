import { model, type ModelCatalog } from './models';

export const TEXT_TO_SPEECH_PROVIDER_ID = 'elevenlabs';

export const TEXT_TO_SPEECH_MODELS_BY_PROVIDER = {
	cartesia: [model('sonic-3.5', 'Sonic 3.5'), model('sonic-3', 'Sonic 3')],
	deepgram: [model('aura-2', 'Aura 2')],
	elevenlabs: [
		model('eleven_v3', 'Eleven v3'),
		model('eleven_multilingual_v2', 'Eleven Multilingual v2'),
		model('eleven_flash_v2_5', 'Eleven Flash v2.5'),
	],
	google: [model('gemini-3.1-flash-tts-preview', 'Gemini 3.1 Flash TTS Preview')],
	minimax: [model('Speech-2.8-HD', 'Speech 2.8 HD'), model('Speech-2.8-Turbo', 'Speech 2.8 Turbo')],
	mistral: [model('voxtral-tts-2603', 'Voxtral TTS 2603')],
	openai: [model('gpt-4o-mini-tts', 'GPT-4o Mini TTS'), model('tts-1-hd', 'TTS-1 HD')],
} as const satisfies ModelCatalog;

export const TTS_MODELS_BY_PROVIDER = TEXT_TO_SPEECH_MODELS_BY_PROVIDER;
export const TEXT_TO_SPEECH_MODELS =
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER[TEXT_TO_SPEECH_PROVIDER_ID];
export const TEXT_TO_SPEECH_PROVIDER_IDS = [
	'cartesia',
	'deepgram',
	'elevenlabs',
	'google',
	'minimax',
	'mistral',
	'openai',
] as const;
