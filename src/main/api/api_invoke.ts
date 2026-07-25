import { ipcHandlers } from '../ipc/core/registry';
import type { IpcResult } from '../../shared/ipc_types';

/** Run a registered IPC channel on behalf of a caller outside a renderer window. */
export async function invoke(channel: string, args: unknown[]): Promise<IpcResult<unknown>> {
	const handler = ipcHandlers.get(channel);
	if (!handler) {
		return {
			success: false,
			error: {
				code: 'UnknownChannel',
				message: `Channel "${channel}" is unknown or only callable from a window.`,
			},
		};
	}
	return handler(...args);
}
