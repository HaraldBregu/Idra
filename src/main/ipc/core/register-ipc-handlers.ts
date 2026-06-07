import { AgentIpc } from '../agent';
import { AppIpc } from '../app';
import { ChannelsIpc } from '../channels';
import { ConnectorsIpc } from '../connectors';
import { CronIpc } from '../cron';
import { RealtimeTranscriptionIpc } from '../realtime-transcription';
import { SkillsIpc } from '../skills';
import { SpeechToTextIpc } from '../speech-to-text';
import { StoreIpc } from '../store';
import { WindowIpc } from '../window';
import type { IpcModule } from './module';
import type { EventBus } from '../../services';
import type { MainServiceContainer } from '../../services/services';

export function registerIpcHandlers(container: MainServiceContainer, eventBus: EventBus): void {
	const logger = container.get('logger');

	const ipcModules: IpcModule[] = [
		new AppIpc(),
		new AgentIpc(),
		new ChannelsIpc(),
		new ConnectorsIpc(),
		new CronIpc(),
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
