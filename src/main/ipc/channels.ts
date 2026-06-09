import { ipcMain } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { wrapSimpleHandler } from './core/error-handler';
import { ChannelsChannels } from '../../shared/ipc/ipc-channels';
import { type ChannelStatusEvent, type ChannelType } from '../../shared/channels';
import { listChannelCatalog } from '../../shared/channels';
import { ChannelRegistry } from '../channels';
import { LoggerService } from '../observability';

export class ChannelsIpc implements IpcModule {
	readonly name = 'channels';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get(LoggerService);
		const channelRegistry = container.get(ChannelRegistry);

		ipcMain.handle(
			ChannelsChannels.listCatalog,
			wrapSimpleHandler(() => {
				return listChannelCatalog();
			}, ChannelsChannels.listCatalog)
		);

		ipcMain.handle(
			ChannelsChannels.getStatus,
			wrapSimpleHandler((type?: ChannelType): ChannelStatusEvent | undefined => {
				return channelRegistry.getStatus(type);
			}, ChannelsChannels.getStatus)
		);

		ipcMain.handle(
			ChannelsChannels.getTelegramStatus,
			wrapSimpleHandler((): ChannelStatusEvent | undefined => {
				return channelRegistry.getStatus();
			}, ChannelsChannels.getTelegramStatus)
		);

		ipcMain.handle(
			ChannelsChannels.stopTelegram,
			wrapSimpleHandler(async (): Promise<void> => {
				await channelRegistry.stopTelegram();
			}, ChannelsChannels.stopTelegram)
		);

		logger.info('ChannelsIpc', `Registered ${this.name} module`);
	}
}
