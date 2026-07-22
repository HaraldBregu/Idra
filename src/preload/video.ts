import { typedInvokeUnwrap } from '../shared/ipc_types';
import { VideoChannels } from '../shared/ipc_channels_definitions';
import type { VideoApi } from './index.d';
import { optionalTrimmedString } from './normalize';

export const video: VideoApi = {
	createVideo: (request) => {
		const prompt = optionalTrimmedString(request?.prompt);
		if (!prompt) throw new Error('Invalid video prompt.');
		const providerId = optionalTrimmedString(request?.providerId);
		const modelId = optionalTrimmedString(request?.modelId);
		return typedInvokeUnwrap(VideoChannels.createVideo, {
			prompt,
			...(providerId ? { providerId } : {}),
			...(modelId ? { modelId } : {}),
		});
	},
	getProviderId: () => {
		return typedInvokeUnwrap(VideoChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid video provider id.');
		return typedInvokeUnwrap(VideoChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(VideoChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid video model id.');
		return typedInvokeUnwrap(VideoChannels.setModelId, normalizedModelId);
	},
};
