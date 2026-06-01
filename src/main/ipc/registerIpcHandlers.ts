import {
	AgentIpc,
	AppIpc,
	ChannelsIpc,
	ConnectorsIpc,
	CronIpc,
	HeartbeatIpc,
	RealtimeTranscriptionIpc,
	SkillsIpc,
	SpeechToTextIpc,
	StoreIpc,
	TasksIpc,
	WindowIpc,
	type IpcModule,
} from './index';
import type { EventBus } from '../services';
import type { MainServiceContainer } from '../services/services';

export function registerIpcHandlers(container: MainServiceContainer, eventBus: EventBus): void {
	const logger = container.get('logger');

	const ipcModules: IpcModule[] = [
		new AppIpc(),
		new AgentIpc(),
		new ChannelsIpc(),
		new ConnectorsIpc(),
		new CronIpc(),
		new HeartbeatIpc(),
		new RealtimeTranscriptionIpc(),
		new SpeechToTextIpc(),
		new SkillsIpc(),
		new StoreIpc(),
		new TasksIpc(),
		new WindowIpc(),
	];

	for (const module of ipcModules) {
		try {
			module.register(container, eventBus);
		} catch (error) {
			logger.error('Bootstrap', `Failed to register IPC module: ${module.name}`, error);
		}
	}

	logger.info('Bootstrap', `Registered ${ipcModules.length} IPC modules`);
}
