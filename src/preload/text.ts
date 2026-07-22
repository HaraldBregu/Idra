import { typedInvokeUnwrap } from '../shared/ipc_types';
import { TextChannels } from '../shared/ipc_channels_definitions';
import type { TextApi } from './index.d';
import { optionalTrimmedString } from './normalize';

export const text: TextApi = {
	generateText: (request) => {
		const prompt = optionalTrimmedString(request?.prompt);
		if (!prompt) throw new Error('Invalid text prompt.');
		const providerId = optionalTrimmedString(request?.providerId);
		const modelId = optionalTrimmedString(request?.modelId);
		return typedInvokeUnwrap(TextChannels.generateText, {
			prompt,
			...(providerId ? { providerId } : {}),
			...(modelId ? { modelId } : {}),
		});
	},
	getProviderId: () => {
		return typedInvokeUnwrap(TextChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid text provider id.');
		return typedInvokeUnwrap(TextChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(TextChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid text model id.');
		return typedInvokeUnwrap(TextChannels.setModelId, normalizedModelId);
	},
};
