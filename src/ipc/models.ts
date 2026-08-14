import type { IpcModule } from './core/module';
import type { EventBus } from '../event_bus';
import { registerCommand, registerCommandWithEvent, registerQuery } from './core/gateway';
import {
	EmbeddingChannels,
	ImageChannels,
	SoundChannels,
	SpeechChannels,
	RealtimeVoiceChannels,
	SttChannels,
	TextChannels,
	VideoChannels,
} from '../shared/ipc_channels_definitions';
import { embedding, image, sound, text, video, voice } from '../models/index';
import {
	getModelId,
	getOptions,
	getProviderId,
	setModelId,
	setOptions,
	setProviderId,
} from '../models/selection';
import {
	appendRealtimeAudio,
	cancelRealtime,
	finishRealtime,
	getSelection,
	listModels,
	listProviders,
	saveSelection,
	startRealtime,
	transcribe as sttTranscribe,
} from '../models/adapters/stt';
import { getRealtimeVoiceSetup, setRealtimeVoiceSetup } from '../agent/realtime_voice/setup';

export class ModelsIpc implements IpcModule {
	readonly name = 'models';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(EmbeddingChannels.createEmbedding, (request) =>
			embedding.createEmbedding(request)
		);
		registerQuery(EmbeddingChannels.getProviderId, () => getProviderId('embedding'));
		registerCommand(EmbeddingChannels.setProviderId, (providerId) =>
			setProviderId('embedding', providerId)
		);
		registerQuery(EmbeddingChannels.getModelId, () => getModelId('embedding'));
		registerCommand(EmbeddingChannels.setModelId, (modelId) => setModelId('embedding', modelId));

		registerCommand(ImageChannels.createImage, (request) => image.createImage(request));
		registerQuery(ImageChannels.getProviderId, () => getProviderId('image'));
		registerCommand(ImageChannels.setProviderId, (providerId) =>
			setProviderId('image', providerId)
		);
		registerQuery(ImageChannels.getModelId, () => getModelId('image'));
		registerCommand(ImageChannels.setModelId, (modelId) => setModelId('image', modelId));
		registerQuery(ImageChannels.getOptions, () => getOptions('image'));
		registerCommand(ImageChannels.setOptions, (options) => {
			setOptions('image', options);
			return getOptions('image');
		});

		registerCommand(SoundChannels.createSound, async (request) => {
			const result = await sound.createSound(request);
			await sound.saveSoundFile(result);
			return result;
		});
		registerQuery(SoundChannels.listSounds, () => sound.listSounds());
		registerQuery(SoundChannels.getProviderId, () => getProviderId('sound'));
		registerCommand(SoundChannels.setProviderId, (providerId) =>
			setProviderId('sound', providerId)
		);
		registerQuery(SoundChannels.getModelId, () => getModelId('sound'));
		registerCommand(SoundChannels.setModelId, (modelId) => setModelId('sound', modelId));
		registerQuery(SoundChannels.getOptions, () => getOptions('sound'));
		registerCommand(SoundChannels.setOptions, (options) => {
			setOptions('sound', options);
			return getOptions('sound');
		});

		registerCommand(TextChannels.generateText, (request) => text.generateText(request));
		registerQuery(TextChannels.getProviderId, () => getProviderId('text'));
		registerCommand(TextChannels.setProviderId, (providerId) => setProviderId('text', providerId));
		registerQuery(TextChannels.getModelId, () => getModelId('text'));
		registerCommand(TextChannels.setModelId, (modelId) => setModelId('text', modelId));

		registerCommand(VideoChannels.createVideo, async (request) => {
			const result = await video.createVideo(request);
			const path = await video.saveVideoFile(result);
			return { ...result, path };
		});
		registerQuery(VideoChannels.getProviderId, () => getProviderId('video'));
		registerCommand(VideoChannels.setProviderId, (providerId) =>
			setProviderId('video', providerId)
		);
		registerQuery(VideoChannels.getModelId, () => getModelId('video'));
		registerCommand(VideoChannels.setModelId, (modelId) => setModelId('video', modelId));
		registerQuery(VideoChannels.getOptions, () => getOptions('video'));
		registerCommand(VideoChannels.setOptions, (options) => {
			setOptions('video', options);
			return getOptions('video');
		});

		registerCommand(SpeechChannels.synthesize, (request) => voice.synthesize(request));
		registerQuery(SpeechChannels.getProviderId, () => getProviderId('voice'));
		registerQuery(SpeechChannels.getOptions, () => getOptions('voice'));
		registerCommand(SpeechChannels.setOptions, (options) => {
			setOptions('voice', options);
			return getOptions('voice');
		});
		registerCommand(SpeechChannels.setProviderId, (providerId) =>
			setProviderId('voice', providerId)
		);
		registerQuery(SpeechChannels.getModelId, () => getModelId('voice'));
		registerCommand(SpeechChannels.setModelId, (modelId) => setModelId('voice', modelId));

		registerQuery(RealtimeVoiceChannels.getProviderId, () => getProviderId('realtimeVoice'));
		registerQuery(RealtimeVoiceChannels.getSetup, () => getRealtimeVoiceSetup());
		registerCommand(RealtimeVoiceChannels.setSetup, (request) => setRealtimeVoiceSetup(request));
		registerCommand(RealtimeVoiceChannels.setProviderId, (providerId) => {
			if (typeof providerId !== 'string' || !providerId.trim()) {
				throw new Error('Invalid realtime voice provider id.');
			}
			setProviderId('realtimeVoice', providerId.trim());
		});
		registerQuery(RealtimeVoiceChannels.getModelId, () => getModelId('realtimeVoice'));
		registerCommand(RealtimeVoiceChannels.setModelId, (modelId) => {
			if (typeof modelId !== 'string' || !modelId.trim()) {
				throw new Error('Invalid realtime voice model id.');
			}
			setModelId('realtimeVoice', modelId.trim());
		});
		registerQuery(RealtimeVoiceChannels.getOptions, () => getOptions('realtimeVoice'));
		registerCommand(RealtimeVoiceChannels.setOptions, (options) => {
			if (!options || typeof options !== 'object' || Array.isArray(options)) {
				throw new Error('Invalid realtime voice options.');
			}
			setOptions('realtimeVoice', { ...options });
			return getOptions('realtimeVoice');
		});

		registerQuery(SttChannels.getSelection, (mode) => getSelection(mode));
		registerQuery(SttChannels.listProviders, () => listProviders());
		registerQuery(SttChannels.listModels, (providerId) => listModels(providerId));
		registerCommand(SttChannels.saveSelection, (providerId, modelId, mode) =>
			saveSelection(providerId, modelId, mode)
		);
		registerQuery(SttChannels.getProviderId, () => getProviderId('transcribe'));
		registerCommand(SttChannels.setProviderId, (providerId) =>
			setProviderId('transcribe', providerId)
		);
		registerQuery(SttChannels.getModelId, () => getModelId('transcribe'));
		registerCommand(SttChannels.setModelId, (modelId) => setModelId('transcribe', modelId));
		registerCommand(SttChannels.transcribe, (request) => sttTranscribe(request));
		registerCommandWithEvent(SttChannels.startRealtime, (event, request) =>
			startRealtime(request, (sttEvent) => {
				event.sender.send(SttChannels.realtimeEvent, sttEvent);
			})
		);
		registerCommand(SttChannels.appendRealtimeAudio, (sessionId, audio) =>
			appendRealtimeAudio(sessionId, audio)
		);
		registerCommand(SttChannels.finishRealtime, (sessionId) => finishRealtime(sessionId));
		registerCommand(SttChannels.cancelRealtime, (sessionId) => cancelRealtime(sessionId));
	}
}
