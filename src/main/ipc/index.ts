/**
 * IPC Module exports.
 * Each module is responsible for registering its own IPC handlers.
 */

export type { IpcModule } from './ipc-module';
export { AgentIpc } from './agent-ipc';
export { AppIpc } from './app-ipc';
export { ChannelsIpc } from './channels-ipc';
export { ConnectorsIpc } from './connectors-ipc';
export { CronIpc } from './cron-ipc';
export { HeartbeatIpc } from './heartbeat-ipc';
export { RealtimeTranscriptionIpc } from './realtime-transcription-ipc';
export { SkillsIpc } from './skills-ipc';
export { TasksIpc } from './tasks-ipc';
export { WindowIpc } from './window-ipc';
