import { typedInvokeUnwrap } from '../shared/ipc_types';
import { ImageChannels } from '../shared/ipc_channels_definitions';
import type { ImageApi } from './index.d';
import { optionalTrimmedString } from './normalize';

export const image: ImageApi = {
	createImage: (request) => {
		const prompt = optionalTrimmedString(request?.prompt);
		if (!prompt) throw new Error('Invalid image prompt.');
		const providerId = optionalTrimmedString(request?.providerId);
		const modelId = optionalTrimmedString(request?.modelId);
		return typedInvokeUnwrap(ImageChannels.createImage, {
			prompt,
			...(providerId ? { providerId } : {}),
			...(modelId ? { modelId } : {}),
		});
	},
	getProviderId: () => {
		return typedInvokeUnwrap(ImageChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid image provider id.');
		return typedInvokeUnwrap(ImageChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(ImageChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid image model id.');
		return typedInvokeUnwrap(ImageChannels.setModelId, normalizedModelId);
	},
};
