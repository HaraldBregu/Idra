import { AgentIpc } from '../agent';
import { AppIpc } from '../app';
import { ChannelsIpc } from '../channels';
import { ConnectorsIpc } from '../connectors';
import { CronIpc } from '../cron';
import { HeartbeatIpc } from '../heartbeat';
import { ProviderStoreIpc } from '../provider';
import { SkillsIpc } from '../skills';
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
		new HeartbeatIpc(),
		new ProviderStoreIpc(),
		new SkillsIpc(),
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
