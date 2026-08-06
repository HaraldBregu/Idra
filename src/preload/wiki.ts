import { typedInvokeUnwrap } from '../shared/ipc_types';
import { WikiChannels } from '../shared/ipc_channels_definitions';
import type { WikiApi } from './index.d';

export const wiki: WikiApi = {
	getSettings: () => typedInvokeUnwrap(WikiChannels.getSettings),
	getStatus: () => typedInvokeUnwrap(WikiChannels.getStatus),
	saveSettings: (settings) => typedInvokeUnwrap(WikiChannels.saveSettings, settings),
	run: () => typedInvokeUnwrap(WikiChannels.run),
	cancel: () => typedInvokeUnwrap(WikiChannels.cancel),
	pickDirectory: (kind) => typedInvokeUnwrap(WikiChannels.pickDirectory, kind),
	openDirectory: (kind) => typedInvokeUnwrap(WikiChannels.openDirectory, kind),
};
