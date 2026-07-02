import type { SpeechSynthesisRequest, SpeechSynthesisResult } from '../../speech/speech-types';

export const SpeechChannels = {
	getModelId: 'speech:get-model-id',
	getProviderId: 'speech:get-provider-id',
	setModelId: 'speech:set-model-id',
	setProviderId: 'speech:set-provider-id',
	synthesize: 'speech:synthesize',
} as const;

export interface SpeechInvokeChannelMap {
	[SpeechChannels.synthesize]: {
		args: [request: SpeechSynthesisRequest];
		result: SpeechSynthesisResult;
	};
	[SpeechChannels.getProviderId]: {
		args: [];
		result: string | undefined;
	};
	[SpeechChannels.setProviderId]: {
		args: [providerId: string];
		result: void;
	};
	[SpeechChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[SpeechChannels.setModelId]: {
		args: [modelId: string];
		result: void;
	};
}
