import { typedInvokeUnwrap } from '../shared/ipc_types';
import { CronChannels } from '../shared/ipc_channels_definitions';
import type { CronApi } from './index.d';

export const cron: CronApi = {
	list: () => {
		return typedInvokeUnwrap(CronChannels.list);
	},
	getRuntime: () => {
		return typedInvokeUnwrap(CronChannels.getRuntime);
	},
	setRuntime: (providerId: string, modelId: string) => {
		return typedInvokeUnwrap(CronChannels.setRuntime, providerId, modelId);
	},
};
