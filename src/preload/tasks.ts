import { typedInvokeUnwrap } from '../shared/ipc_types';
import { TaskChannels } from '../shared/ipc_channels_definitions';
import type { TaskApi } from './index.d';

export const tasks: TaskApi = {
	list: () => {
		return typedInvokeUnwrap(TaskChannels.list);
	},
	getRuntime: () => {
		return typedInvokeUnwrap(TaskChannels.getRuntime);
	},
	setRuntime: (providerId: string, modelId: string) => {
		return typedInvokeUnwrap(TaskChannels.setRuntime, providerId, modelId);
	},
	getPermissions: () => {
		return typedInvokeUnwrap(TaskChannels.permissionsGet);
	},
	savePermissions: (permissions) => {
		return typedInvokeUnwrap(TaskChannels.permissionsSave, permissions);
	},
	resetPermissions: () => {
		return typedInvokeUnwrap(TaskChannels.permissionsReset);
	},
	configureCapabilities: (scheduleId: string, enabled: boolean, toolsAllow: string[]) => {
		return typedInvokeUnwrap(
			TaskChannels.configureCapabilities,
			scheduleId,
			enabled,
			toolsAllow
		);
	},
};
