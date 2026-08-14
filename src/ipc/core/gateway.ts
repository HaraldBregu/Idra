import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { wrapSimpleHandler, wrapIpcHandler } from './error_handler';
import type { InvokeChannelMap } from '../../../shared/ipc_channels_types';

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
	ipcMain.handle(channel, wrapSimpleHandler(handler, channel));
}

export function registerQueryWithEvent<C extends keyof InvokeChannelMap>(
	channel: C,
	handler: (
		event: IpcMainInvokeEvent,
		...args: InvokeChannelMap[C]['args']
	) => Promise<InvokeChannelMap[C]['result']> | InvokeChannelMap[C]['result']
): void;
export function registerQueryWithEvent<TArgs extends unknown[], TResult>(
	channel: string,
	handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult
): void;
export function registerQueryWithEvent(
	channel: string,
	handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
	ipcMain.handle(channel, wrapIpcHandler(handler, channel));
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
	ipcMain.handle(channel, wrapSimpleHandler(handler, channel));
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
