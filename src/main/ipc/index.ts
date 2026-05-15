/**
 * IPC Module exports.
 * Each module is responsible for registering its own IPC handlers.
 */

export type { IpcModule } from './ipc-module';
export { AssistantIpc } from './assistant-ipc';
export { AppIpc } from './app-ipc';
export { ChannelsIpc } from './channels-ipc';
export { ConnectorsIpc } from './connectors-ipc';
export { CronIpc } from './cron-ipc';
export { SkillsIpc } from './skills-ipc';
export { TaskIpc } from '../task-manager/electron/task-ipc-main';
export { WindowIpc } from './window-ipc';
