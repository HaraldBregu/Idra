import { typedInvokeUnwrap } from '../shared/ipc_types';
import { PluginChannels } from '../shared/ipc_channels_definitions';
import type { PluginsApi } from './index.d';

export const plugins: PluginsApi = {
	list: () => {
		return typedInvokeUnwrap(PluginChannels.list);
	},
	install: () => {
		return typedInvokeUnwrap(PluginChannels.install);
	},
};
