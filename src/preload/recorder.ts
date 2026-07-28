import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { RecorderChannels } from '../shared/ipc_channels_definitions';
import type { RecorderApi, RecorderTrackApi } from './index.d';

type Channels = (typeof RecorderChannels)[keyof typeof RecorderChannels];

function track(channels: Channels): RecorderTrackApi {
	return {
		start: (config) => typedInvokeUnwrap(channels.start, config),
		stop: (id) => typedInvokeUnwrap(channels.stop, id),
		cancel: (id) => typedInvokeUnwrap(channels.cancel, id),
		list: () => typedInvokeUnwrap(channels.list),
		complete: (result) => typedInvokeUnwrap(channels.complete, result),
		onCommand: (callback) => typedOn(channels.command, callback),
		onEvent: (callback) => typedOn(channels.event, callback),
	};
}

export const recorder: RecorderApi = {
	microphone: track(RecorderChannels.microphone),
	camera: track(RecorderChannels.camera),
	screen: track(RecorderChannels.screen),
};
