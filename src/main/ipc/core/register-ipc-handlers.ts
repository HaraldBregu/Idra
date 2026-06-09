import { AgentIpc } from '../agent';
import { AgentStoreIpc } from '../agent-store';
import { AppIpc } from '../app';
import { ChannelsIpc } from '../channels';
import { CronIpc } from '../cron';
import { ProviderStoreIpc } from '../provider';
import { WindowIpc } from '../window';
import type { IpcModule } from './module';
import type { EventBus } from '../../services';
import type { MainServiceContainer } from '../../services/services';
import { LoggerService } from '../../observability';

export function registerIpcHandlers(container: MainServiceContainer, eventBus: EventBus): void {
	const logger = container.get(LoggerService);

	const ipcModules: IpcModule[] = [
		new AppIpc(),
		new AgentIpc(),
		new AgentStoreIpc(),
		new ChannelsIpc(),
		new CronIpc(),
		new ProviderStoreIpc(),
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
