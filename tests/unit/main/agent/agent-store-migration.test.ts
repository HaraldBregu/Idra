let persisted: Record<string, unknown> = {};

jest.mock('electron-store', () =>
	jest.fn().mockImplementation(() => {
		let backing: Record<string, unknown> = {
			providerId: 'openai',
			modelId: 'gpt-5',
			modelOptions: { reasoning: 'high' },
			search_engine: { providerId: 'brave', providerName: 'Brave', enabled: true },
			image_model: { providerId: 'openai', modelId: 'image-1', options: {} },
			audio_model: { providerId: 'elevenlabs', modelId: 'sound-1', options: {} },
			video_model: { providerId: 'google', modelId: 'veo-3', options: {} },
			voice_model: { providerId: 'openai', modelId: 'tts-1', options: { voice: 'alloy' } },
			realtime_voice_model: { providerId: 'openai', modelId: 'realtime-1', options: {} },
			permissions: {
				read: { allow: [], deny: [] },
				write: { allow: [], deny: [] },
				exec: { allow: [], deny: [] },
			},
		};
		return {
			get: (key: string) => backing[key],
			set: (key: string, value: unknown) => {
				backing[key] = value;
			},
			get store() {
				return backing;
			},
			set store(value: Record<string, unknown>) {
				backing = value;
				persisted = value;
			},
		};
	})
);

import '../../../../src/main/agent/agent_store';

it('migrates legacy agent settings to descriptive keys', () => {
	expect(persisted).toMatchObject({
		large_language_model: {
			providerId: 'openai',
			modelId: 'gpt-5',
			options: { reasoning: 'high' },
		},
		web_search_engine: { providerId: 'brave', providerName: 'Brave', enabled: true },
		image_generator_model: { providerId: 'openai', modelId: 'image-1', options: {} },
		audio_generator_model: { providerId: 'elevenlabs', modelId: 'sound-1', options: {} },
		video_generator_model: { providerId: 'google', modelId: 'veo-3', options: {} },
		text_to_speech_model: {
			providerId: 'openai',
			modelId: 'tts-1',
			options: { voice: 'alloy' },
		},
		transcription_model: { providerId: '', modelId: '', options: {} },
	});
	expect(persisted).not.toHaveProperty('providerId');
	expect(persisted).not.toHaveProperty('modelId');
	expect(persisted).not.toHaveProperty('modelOptions');
	expect(persisted).not.toHaveProperty('search_engine');
	expect(persisted).not.toHaveProperty('image_model');
	expect(persisted).not.toHaveProperty('audio_model');
	expect(persisted).not.toHaveProperty('video_model');
	expect(persisted).not.toHaveProperty('voice_model');
});
