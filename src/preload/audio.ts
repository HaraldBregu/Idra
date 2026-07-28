import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { AudioChannels } from '../shared/ipc_channels_definitions';
import type { AudioApi } from './index.d';

export const audio: AudioApi = {
	start: (config) => typedInvokeUnwrap(AudioChannels.start, config),
	stop: (id) => typedInvokeUnwrap(AudioChannels.stop, id),
	cancel: (id) => typedInvokeUnwrap(AudioChannels.cancel, id),
	list: () => typedInvokeUnwrap(AudioChannels.list),
	complete: (result) => typedInvokeUnwrap(AudioChannels.complete, result),
	onCommand: (callback) => typedOn(AudioChannels.command, callback),
	onEvent: (callback) => typedOn(AudioChannels.event, callback),
};
