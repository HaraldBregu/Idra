/**
 * CQS (Command-Query Separation) gateway helpers for IPC registration.
 *
 * `registerQuery` — read-only operations (no mutation).
 * `registerCommand` — operations that mutate state.
 *
 * Both delegate to the existing `wrapIpcHandler` / `wrapSimpleHandler` from
 * IpcErrorHandler — zero runtime cost, just an organisational signal that
 * makes intent explicit at the registration site and enables future
 * middleware hooks.
 *
 * Overloads:
 *   - With a channel from InvokeChannelMap: fully type-safe args + result.
 *   - With a raw string: fallback for channels not yet in the registry.
 */

import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { wrapSimpleHandler, wrapIpcHandler } from './ipc-error-handler';
import type { InvokeChannelMap } from '../../shared/ipc-channels';

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
