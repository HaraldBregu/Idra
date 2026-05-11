import { ipcRenderer } from 'electron';
import type { IpcResult } from '../shared/ipc';
import type { InvokeChannelMap, SendChannelMap, EventChannelMap } from '../shared/ipc-channels';

export function typedInvoke<C extends keyof InvokeChannelMap>(
	channel: C,
	...args: InvokeChannelMap[C]['args']
): Promise<InvokeChannelMap[C]['result']> {
	return ipcRenderer.invoke(channel, ...args) as Promise<InvokeChannelMap[C]['result']>;
}

export function typedInvokeUnwrap<C extends keyof InvokeChannelMap>(
	channel: C,
	...args: InvokeChannelMap[C]['args']
): Promise<InvokeChannelMap[C]['result']>;
export function typedInvokeUnwrap<TResult = unknown>(
	channel: string,
	...args: unknown[]
): Promise<TResult>;
export async function typedInvokeUnwrap(channel: string, ...args: unknown[]): Promise<unknown> {
	const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<unknown>;
	if (!result.success) {
		throw new Error(result.error.message);
	}
	return result.data;
}

export function typedInvokeRaw<C extends keyof InvokeChannelMap>(
	channel: C,
	...args: InvokeChannelMap[C]['args']
): Promise<IpcResult<InvokeChannelMap[C]['result']>> {
	return ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<InvokeChannelMap[C]['result']>>;
}

export function typedSend<C extends keyof SendChannelMap>(
	channel: C,
	...args: SendChannelMap[C]['args']
): void {
	ipcRenderer.send(channel, ...args);
}

export function typedOn<C extends keyof EventChannelMap>(
	channel: C,
	callback: (data: EventChannelMap[C]['data']) => void
): () => void {
	const handler = (_event: Electron.IpcRendererEvent, data: EventChannelMap[C]['data']): void => {
		callback(data);
	};
	ipcRenderer.on(channel, handler as Parameters<typeof ipcRenderer.on>[1]);
	return (): void => {
		ipcRenderer.removeListener(channel, handler as Parameters<typeof ipcRenderer.on>[1]);
	};
}
