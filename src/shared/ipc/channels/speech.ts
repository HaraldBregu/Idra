import type { SpeechSynthesisRequest, SpeechSynthesisResult } from '../../speech/types';

export const SpeechChannels = {
	synthesize: 'speech:synthesize',
} as const;

export interface SpeechInvokeChannelMap {
	[SpeechChannels.synthesize]: {
		args: [request: SpeechSynthesisRequest];
		result: SpeechSynthesisResult;
	};
}
