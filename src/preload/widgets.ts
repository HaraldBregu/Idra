import { typedInvokeUnwrap } from '../shared/ipc_types';
import { WidgetChannels } from '../shared/ipc_channels_definitions';
import type { WidgetsApi } from './index.d';

export const widgets: WidgetsApi = {
	list: () => {
		return typedInvokeUnwrap(WidgetChannels.list);
	},
};
