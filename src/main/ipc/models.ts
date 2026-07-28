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
