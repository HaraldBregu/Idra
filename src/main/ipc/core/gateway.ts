import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { wrapSimpleHandler, wrapIpcHandler } from './error_handler';
import { ipcHandlers } from './registry';
import type { IpcResult } from '../../../shared/ipc_types';
import type { InvokeChannelMap } from '../../../shared/ipc_channels_types';

/** Register a handler for renderers, and for callers outside a renderer window. */
function expose(
	channel: string,
	handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<IpcResult<unknown>>
): void {
	ipcMain.handle(channel, handler);
	ipcHandlers.set(channel, (...args) => handler(undefined as never, ...args));
}

// ---- registerQuery --------------------------------------------------------

/**
 * Register a read-only query handler on a typed channel.
 * The handler does **not** receive the raw IpcMainInvokeEvent.
 */
export function registerQuery<C extends keyof InvokeChannelMap>(
	channel: C,
	handler: (
		...args: InvokeChannelMap[C]['args']
	) => Promise<InvokeChannelMap[C]['result']> | InvokeChannelMap[C]['result']
): void;
/** Fallback overload for channels not yet in the registry. */
export function registerQuery<TArgs extends unknown[], TResult>(
	channel: string,
	handler: (...args: TArgs) => Promise<TResult> | TResult
): void;
export function registerQuery(channel: string, handler: (...args: unknown[]) => unknown): void {
	expose(channel, wrapSimpleHandler(handler, channel));
}

// ---- registerCommand ------------------------------------------------------

/**
 * Register a state-mutating command handler on a typed channel.
 * The handler does **not** receive the raw IpcMainInvokeEvent.
 */
export function registerCommand<C extends keyof InvokeChannelMap>(
	channel: C,
	handler: (
		...args: InvokeChannelMap[C]['args']
	) => Promise<InvokeChannelMap[C]['result']> | InvokeChannelMap[C]['result']
): void;
/** Fallback overload for channels not yet in the registry. */
export function registerCommand<TArgs extends unknown[], TResult>(
	channel: string,
	handler: (...args: TArgs) => Promise<TResult> | TResult
): void;
export function registerCommand(channel: string, handler: (...args: unknown[]) => unknown): void {
	expose(channel, wrapSimpleHandler(handler, channel));
}

// ---- registerCommandWithEvent ---------------------------------------------

/**
 * Register a state-mutating command handler that needs access to the raw
 * IpcMainInvokeEvent (e.g. to read `event.sender`).
 */
export function registerCommandWithEvent<C extends keyof InvokeChannelMap>(
	channel: C,
	handler: (
		event: IpcMainInvokeEvent,
		...args: InvokeChannelMap[C]['args']
	) => Promise<InvokeChannelMap[C]['result']> | InvokeChannelMap[C]['result']
): void;
/** Fallback overload for channels not yet in the registry. */
export function registerCommandWithEvent<TArgs extends unknown[], TResult>(
	channel: string,
	handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult
): void;
export function registerCommandWithEvent(
	channel: string,
	handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
	ipcMain.handle(channel, wrapIpcHandler(handler, channel));
}
