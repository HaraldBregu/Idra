import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerCommandWithEvent, registerQuery } from './core/gateway';
import {
	EmbeddingChannels,
	ImageChannels,
	SoundChannels,
	SpeechChannels,
	SttChannels,
	TextChannels,
	VideoChannels,
} from '../../shared/ipc_channels_definitions';
import { embedding, image, sound, text, video, voice } from '../app/models/index';
import { getModelId, getProviderId, setModelId, setProviderId } from '../app/models/models_store';
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
} from '../app/models/adapters/stt';

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

		registerCommand(SpeechChannels.synthesize, (request) => voice.synthesize(request));
		registerQuery(SpeechChannels.getProviderId, () => getProviderId('voice'));
		registerCommand(SpeechChannels.setProviderId, (providerId) =>
			setProviderId('voice', providerId)
		);
		registerQuery(SpeechChannels.getModelId, () => getModelId('voice'));
		registerCommand(SpeechChannels.setModelId, (modelId) => setModelId('voice', modelId));

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
