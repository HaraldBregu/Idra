import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerCommandWithEvent, registerQuery } from './core/gateway';
import {
	ImageChannels,
	SoundChannels,
	SpeechChannels,
	SttChannels,
	TextChannels,
	VideoChannels,
} from '../../shared/ipc_channels_definitions';
import { image, sound, text, transcribe, video, voice } from '../models';
import { getModelId, getProviderId, setModelId, setProviderId } from '../models/models_store';
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
} from '../app/models_adapters/stt';

export class ModelsIpc implements IpcModule {
	readonly name = 'models';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(ImageChannels.createImage, (request) => image.createImage(request));
		registerQuery(ImageChannels.getProviderId, () => image.getProviderId());
		registerCommand(ImageChannels.setProviderId, (providerId) => image.setProviderId(providerId));
		registerQuery(ImageChannels.getModelId, () => image.getModelId());
		registerCommand(ImageChannels.setModelId, (modelId) => image.setModelId(modelId));

		registerCommand(SoundChannels.createSound, async (request) => {
			const result = await sound.createSound(request);
			await sound.saveSoundFile(result);
			return result;
		});
		registerQuery(SoundChannels.listSounds, () => sound.listSounds());
		registerQuery(SoundChannels.getProviderId, () => sound.getProviderId());
		registerCommand(SoundChannels.setProviderId, (providerId) => sound.setProviderId(providerId));
		registerQuery(SoundChannels.getModelId, () => sound.getModelId());
		registerCommand(SoundChannels.setModelId, (modelId) => sound.setModelId(modelId));

		registerCommand(TextChannels.generateText, (request) => text.generateText(request));
		registerQuery(TextChannels.getProviderId, () => text.getProviderId());
		registerCommand(TextChannels.setProviderId, (providerId) => text.setProviderId(providerId));
		registerQuery(TextChannels.getModelId, () => text.getModelId());
		registerCommand(TextChannels.setModelId, (modelId) => text.setModelId(modelId));

		registerCommand(VideoChannels.createVideo, async (request) => {
			const result = await video.createVideo(request);
			const path = await video.saveVideoFile(result);
			return { ...result, path };
		});
		registerQuery(VideoChannels.getProviderId, () => video.getProviderId());
		registerCommand(VideoChannels.setProviderId, (providerId) => video.setProviderId(providerId));
		registerQuery(VideoChannels.getModelId, () => video.getModelId());
		registerCommand(VideoChannels.setModelId, (modelId) => video.setModelId(modelId));

		registerCommand(SpeechChannels.synthesize, (request) => voice.synthesize(request));
		registerQuery(SpeechChannels.getProviderId, () => voice.getProviderId());
		registerCommand(SpeechChannels.setProviderId, (providerId) => voice.setProviderId(providerId));
		registerQuery(SpeechChannels.getModelId, () => voice.getModelId());
		registerCommand(SpeechChannels.setModelId, (modelId) => voice.setModelId(modelId));

		registerQuery(SttChannels.getSelection, (mode) => getSelection(mode));
		registerQuery(SttChannels.listProviders, () => listProviders());
		registerQuery(SttChannels.listModels, (providerId) => listModels(providerId));
		registerCommand(SttChannels.saveSelection, (providerId, modelId, mode) =>
			saveSelection(providerId, modelId, mode)
		);
		registerQuery(SttChannels.getProviderId, () => transcribe.getProviderId());
		registerCommand(SttChannels.setProviderId, (providerId) =>
			transcribe.setProviderId(providerId)
		);
		registerQuery(SttChannels.getModelId, () => transcribe.getModelId());
		registerCommand(SttChannels.setModelId, (modelId) => transcribe.setModelId(modelId));
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
