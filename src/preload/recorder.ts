import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { RecorderChannels } from '../shared/ipc_channels_definitions';
import type { RecorderApi } from './index.d';

export const recorder: RecorderApi = {
	microphone: {
		start: (config) => typedInvokeUnwrap(RecorderChannels.microphone.start, config),
		stop: (id) => typedInvokeUnwrap(RecorderChannels.microphone.stop, id),
		cancel: (id) => typedInvokeUnwrap(RecorderChannels.microphone.cancel, id),
		list: () => typedInvokeUnwrap(RecorderChannels.microphone.list),
		complete: (result) => typedInvokeUnwrap(RecorderChannels.microphone.complete, result),
		onCommand: (callback) => typedOn(RecorderChannels.microphone.command, callback),
		onEvent: (callback) => typedOn(RecorderChannels.microphone.event, callback),
	},
	camera: {
		start: (config) => typedInvokeUnwrap(RecorderChannels.camera.start, config),
		stop: (id) => typedInvokeUnwrap(RecorderChannels.camera.stop, id),
		cancel: (id) => typedInvokeUnwrap(RecorderChannels.camera.cancel, id),
		list: () => typedInvokeUnwrap(RecorderChannels.camera.list),
		complete: (result) => typedInvokeUnwrap(RecorderChannels.camera.complete, result),
		onCommand: (callback) => typedOn(RecorderChannels.camera.command, callback),
		onEvent: (callback) => typedOn(RecorderChannels.camera.event, callback),
	},
	screen: {
		start: (config) => typedInvokeUnwrap(RecorderChannels.screen.start, config),
		stop: (id) => typedInvokeUnwrap(RecorderChannels.screen.stop, id),
		cancel: (id) => typedInvokeUnwrap(RecorderChannels.screen.cancel, id),
		list: () => typedInvokeUnwrap(RecorderChannels.screen.list),
		complete: (result) => typedInvokeUnwrap(RecorderChannels.screen.complete, result),
		onCommand: (callback) => typedOn(RecorderChannels.screen.command, callback),
		onEvent: (callback) => typedOn(RecorderChannels.screen.event, callback),
	},
};
