/**
 * IPC Module exports.
 * Each module is responsible for registering its own IPC handlers.
 */

export type { IpcModule } from './ipc-module';
export { AppIpc } from './app-ipc';
export { AssistantIpc } from './assistant-ipc';
export { TaskIpc } from './task-ipc';
export { WindowIpc } from './window-ipc';
