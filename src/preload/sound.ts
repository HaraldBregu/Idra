import { typedInvokeUnwrap } from '../shared/ipc_types';
import { SoundChannels } from '../shared/ipc_channels_definitions';
import type { SoundApi } from './index.d';
import { optionalTrimmedString } from './normalize';

export const sound: SoundApi = {
	createSound: (request) => {
		const prompt = optionalTrimmedString(request?.prompt);
		if (!prompt) throw new Error('Invalid sound prompt.');
		const providerId = optionalTrimmedString(request?.providerId);
		const modelId = optionalTrimmedString(request?.modelId);
		return typedInvokeUnwrap(SoundChannels.createSound, {
			prompt,
			...(providerId ? { providerId } : {}),
			...(modelId ? { modelId } : {}),
		});
	},
	listSounds: () => {
		return typedInvokeUnwrap(SoundChannels.listSounds);
	},
	getProviderId: () => {
		return typedInvokeUnwrap(SoundChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid sound provider id.');
		return typedInvokeUnwrap(SoundChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(SoundChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid sound model id.');
		return typedInvokeUnwrap(SoundChannels.setModelId, normalizedModelId);
	},
};
