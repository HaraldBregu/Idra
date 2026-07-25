import type { IpcResult } from '../../../shared/ipc_types';

/**
 * Channels registered without an IpcMainInvokeEvent, keyed by channel name.
 * Window-scoped handlers stay out so callers outside a renderer cannot reach them.
 */
export const ipcHandlers = new Map<string, (...args: unknown[]) => Promise<IpcResult<unknown>>>();
