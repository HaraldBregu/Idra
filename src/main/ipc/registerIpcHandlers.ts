import { AgentIpc } from './agent.ipc';
import { AppIpc } from './app.ipc';
import { ChannelsIpc } from './channels.ipc';
import { ConnectorsIpc } from './connectors.ipc';
import { CronIpc } from './cron.ipc';
import { HeartbeatIpc } from './heartbeat.ipc';
import { RealtimeTranscriptionIpc } from './realtime-transcription.ipc';
import { SkillsIpc } from './skills.ipc';
import { SpeechToTextIpc } from './speech-to-text.ipc';
import { StoreIpc } from './store.ipc';
import { WindowIpc } from './window.ipc';
import type { IpcModule } from './module';
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
