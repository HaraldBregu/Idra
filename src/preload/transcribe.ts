import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { SttChannels } from '../shared/ipc_channels_definitions';
import type { TranscribeApi } from './index.d';
import {
	normalizeSttRealtimeAudioChunk,
	normalizeSttRealtimeStartRequest,
	normalizeSttTranscriptionRequest,
} from '../shared/stt_transcription';
import { optionalTrimmedString } from './normalize';

function isSttRealtimeSessionId(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export const transcribe: TranscribeApi = {
	transcribe: (request) => {
		return typedInvokeUnwrap(SttChannels.transcribe, normalizeSttTranscriptionRequest(request));
	},
	startRealtime: (request) => {
		return typedInvokeUnwrap(SttChannels.startRealtime, normalizeSttRealtimeStartRequest(request));
	},
	appendRealtimeAudio: (sessionId, audio) => {
		if (!isSttRealtimeSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text realtime session id.');
		}
		return typedInvokeUnwrap(
			SttChannels.appendRealtimeAudio,
			sessionId,
			normalizeSttRealtimeAudioChunk(audio)
		);
	},
	finishRealtime: (sessionId) => {
		if (!isSttRealtimeSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text realtime session id.');
		}
		return typedInvokeUnwrap(SttChannels.finishRealtime, sessionId);
	},
	cancelRealtime: (sessionId) => {
		if (!isSttRealtimeSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text realtime session id.');
		}
		return typedInvokeUnwrap(SttChannels.cancelRealtime, sessionId);
	},
	onRealtimeEvent: (callback) => {
		return typedOn(SttChannels.realtimeEvent, callback);
	},
	getSelection: (mode) => {
		return typedInvokeUnwrap(SttChannels.getSelection, mode);
	},
	listProviders: () => {
		return typedInvokeUnwrap(SttChannels.listProviders);
	},
	listModels: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid speech-to-text provider id.');
		return typedInvokeUnwrap(SttChannels.listModels, normalizedProviderId);
	},
	saveSelection: (providerId, modelId, mode) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedProviderId) throw new Error('Invalid speech-to-text provider id.');
		if (!normalizedModelId) throw new Error('Invalid speech-to-text model id.');
		return typedInvokeUnwrap(
			SttChannels.saveSelection,
			normalizedProviderId,
			normalizedModelId,
			mode
		);
	},
	getProviderId: () => {
		return typedInvokeUnwrap(SttChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid transcribe provider id.');
		return typedInvokeUnwrap(SttChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(SttChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid transcribe model id.');
		return typedInvokeUnwrap(SttChannels.setModelId, normalizedModelId);
	},
};
