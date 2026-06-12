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
import type { Provider } from '../../providers/types';

export const SttChannels = {
	appendRealtimeAudio: 'stt:append-realtime-audio',
	cancelRealtime: 'stt:cancel-realtime',
	finishRealtime: 'stt:finish-realtime',
	getProvider: 'stt:get-provider',
	getSelection: 'stt:get-selection',
	isProviderConfigured: 'stt:is-provider-configured',
	listModels: 'stt:list-models',
	listProviders: 'stt:list-providers',
	realtimeEvent: 'stt:realtime-event',
	saveProvider: 'stt:save-provider',
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
	[SttChannels.getProvider]: {
		args: [providerId: string];
		result: Provider | undefined;
	};
	[SttChannels.saveProvider]: {
		args: [providerId: string, provider: Provider];
		result: Provider;
	};
	[SttChannels.isProviderConfigured]: {
		args: [providerId: string];
		result: boolean;
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
