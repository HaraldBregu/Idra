// ---------------------------------------------------------------------------
// Type-safe IPC helpers for the preload script
// ---------------------------------------------------------------------------
// These wrappers enforce that channel names and argument/result types are
// consistent with the InvokeChannelMap, SendChannelMap, and EventChannelMap
// defined in src/shared/types/ipc/channels.ts.
//
// Three invoke variants are provided so callers can choose the unwrapping
// strategy that matches how the main-process handler is registered:
//
//   typedInvoke       — handler returns T directly (no IpcResult envelope)
//   typedInvokeUnwrap — handler wraps in IpcResult<T>; unwraps to T or throws
//   typedInvokeRaw    — handler wraps in IpcResult<T>; returns the full envelope
// ---------------------------------------------------------------------------

import { ipcRenderer } from 'electron';
import type { IpcResult } from '../shared/types';
import type { InvokeChannelMap, SendChannelMap, EventChannelMap } from '../shared/channels';

// ---------------------------------------------------------------------------
// typedInvoke — channel returns T directly (no IpcResult wrapping)
// ---------------------------------------------------------------------------

/**
 * Invoke an IPC channel that returns its result directly (no IpcResult envelope).
 * The return type is inferred from InvokeChannelMap.
 */
export function typedInvoke<C extends keyof InvokeChannelMap>(
	channel: C,
	...args: InvokeChannelMap[C]['args']
): Promise<InvokeChannelMap[C]['result']> {
	return ipcRenderer.invoke(channel, ...args) as Promise<InvokeChannelMap[C]['result']>;
}

// ---------------------------------------------------------------------------
// typedInvokeUnwrap — channel returns IpcResult<T>; unwrap to T or throw
// ---------------------------------------------------------------------------

/**
 * Invoke an IPC channel that returns IpcResult<T>.
 * Unwraps to T on success, or throws an Error with the IpcError message.
 */
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

// ---------------------------------------------------------------------------
// typedInvokeRaw — channel returns IpcResult<T>; return the full envelope
// ---------------------------------------------------------------------------

/**
 * Invoke an IPC channel that returns IpcResult<T>.
 * Returns the full IpcResult envelope so the caller can discriminate on
 * `result.success` themselves (useful when error details are needed in the UI).
 */
export function typedInvokeRaw<C extends keyof InvokeChannelMap>(
	channel: C,
	...args: InvokeChannelMap[C]['args']
): Promise<IpcResult<InvokeChannelMap[C]['result']>> {
	return ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<InvokeChannelMap[C]['result']>>;
}

// ---------------------------------------------------------------------------
// typedSend — fire-and-forget send (no response expected)
// ---------------------------------------------------------------------------

/**
 * Send a fire-and-forget IPC message.
 * Channel and argument types are enforced by SendChannelMap.
 */
export function typedSend<C extends keyof SendChannelMap>(
	channel: C,
	...args: SendChannelMap[C]['args']
): void {
	ipcRenderer.send(channel, ...args);
}

// ---------------------------------------------------------------------------
// typedOn — subscribe to a main → renderer event
// ---------------------------------------------------------------------------

/**
 * Subscribe to a push event from the main process.
 * Returns a cleanup function that removes the listener when called.
 * Event payload type is inferred from EventChannelMap.
 */
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
