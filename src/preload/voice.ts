import { typedInvokeUnwrap } from '../shared/ipc_types';
import { SpeechChannels } from '../shared/ipc_channels_definitions';
import type { VoiceApi } from './index.d';
import { normalizeSpeechSynthesisRequest } from '../shared/speech_types';
import { optionalTrimmedString } from './normalize';

export const voice: VoiceApi = {
	synthesize: (request) => {
		return typedInvokeUnwrap(SpeechChannels.synthesize, normalizeSpeechSynthesisRequest(request));
	},
	getProviderId: () => {
		return typedInvokeUnwrap(SpeechChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid voice provider id.');
		return typedInvokeUnwrap(SpeechChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(SpeechChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid voice model id.');
		return typedInvokeUnwrap(SpeechChannels.setModelId, normalizedModelId);
	},
};
