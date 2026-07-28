import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { RecorderChannels } from '../shared/ipc_channels_definitions';
import type { RecorderApi } from './index.d';

export const recorder: RecorderApi = {
	audio: {
		start: (config) => typedInvokeUnwrap(RecorderChannels.audio.start, config),
		stop: (id) => typedInvokeUnwrap(RecorderChannels.audio.stop, id),
		cancel: (id) => typedInvokeUnwrap(RecorderChannels.audio.cancel, id),
		list: () => typedInvokeUnwrap(RecorderChannels.audio.list),
		complete: (result) => typedInvokeUnwrap(RecorderChannels.audio.complete, result),
		onCommand: (callback) => typedOn(RecorderChannels.audio.command, callback),
		onEvent: (callback) => typedOn(RecorderChannels.audio.event, callback),
	},
	video: {
		start: (config) => typedInvokeUnwrap(RecorderChannels.video.start, config),
		stop: (id) => typedInvokeUnwrap(RecorderChannels.video.stop, id),
		cancel: (id) => typedInvokeUnwrap(RecorderChannels.video.cancel, id),
		list: () => typedInvokeUnwrap(RecorderChannels.video.list),
		complete: (result) => typedInvokeUnwrap(RecorderChannels.video.complete, result),
		onCommand: (callback) => typedOn(RecorderChannels.video.command, callback),
		onEvent: (callback) => typedOn(RecorderChannels.video.event, callback),
	},
};
