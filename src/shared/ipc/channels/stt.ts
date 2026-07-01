import type {
	SttModelSelection,
	SttRealtimeEvent,
	SttRealtimeStartRequest,
	SttRealtimeSession,
	SttTranscriptionRequest,
	SttTranscriptionResult,
} from '../../stt/transcription';
import type { PublicProvider } from '../../providers';
import type { ProviderModel } from '../../providers/models/types';

export const SttChannels = {
	appendRealtimeAudio: 'stt:append-realtime-audio',
	cancelRealtime: 'stt:cancel-realtime',
	finishRealtime: 'stt:finish-realtime',
	getModelId: 'stt:get-model-id',
	getProviderId: 'stt:get-provider-id',
	getSelection: 'stt:get-selection',
	listModels: 'stt:list-models',
	listProviders: 'stt:list-providers',
	realtimeEvent: 'stt:realtime-event',
	saveSelection: 'stt:save-selection',
	startRealtime: 'stt:start-realtime',
	transcribe: 'stt:transcribe',
} as const;

export interface SttInvokeChannelMap {
	[SttChannels.transcribe]: {
		args: [request: SttTranscriptionRequest];
		result: SttTranscriptionResult;
	};
	[SttChannels.startRealtime]: {
		args: [request: SttRealtimeStartRequest | undefined];
		result: SttRealtimeSession;
	};
	[SttChannels.appendRealtimeAudio]: {
		args: [sessionId: string, audio: string];
		result: void;
	};
	[SttChannels.finishRealtime]: {
		args: [sessionId: string];
		result: void;
	};
	[SttChannels.cancelRealtime]: {
		args: [sessionId: string];
		result: void;
	};
	[SttChannels.getSelection]: {
		args: [];
		result: SttModelSelection | undefined;
	};
	[SttChannels.listProviders]: {
		args: [];
		result: PublicProvider[];
	};
	[SttChannels.listModels]: {
		args: [providerId: string];
		result: ProviderModel[];
	};
	[SttChannels.saveSelection]: {
		args: [providerId: string, modelId: string];
		result: boolean;
	};
}

export interface SttEventChannelMap {
	[SttChannels.realtimeEvent]: { data: SttRealtimeEvent };
}
