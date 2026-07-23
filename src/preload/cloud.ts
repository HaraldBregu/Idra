import { typedInvokeUnwrap } from '../shared/ipc_types';
import { CloudChannels } from '../shared/ipc_channels_definitions';
import type { CloudApi } from './index.d';

export const cloud: CloudApi = {
	getConfig: () => typedInvokeUnwrap(CloudChannels.getConfig),
	saveConfig: (config) => typedInvokeUnwrap(CloudChannels.saveConfig, config),
	testConnection: (config) => typedInvokeUnwrap(CloudChannels.testConnection, config),
	listObjects: (prefix) => typedInvokeUnwrap(CloudChannels.listObjects, prefix),
	putObject: (key, data, contentType) =>
		typedInvokeUnwrap(CloudChannels.putObject, key, data, contentType),
	getObject: (key) => typedInvokeUnwrap(CloudChannels.getObject, key),
	deleteObject: (key) => typedInvokeUnwrap(CloudChannels.deleteObject, key),
	sync: (localDir, prefix) => typedInvokeUnwrap(CloudChannels.sync, localDir, prefix),
	pickFiles: () => typedInvokeUnwrap(CloudChannels.pickFiles),
	push: () => typedInvokeUnwrap(CloudChannels.push),
};
