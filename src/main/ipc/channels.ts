import { ipcMain } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { wrapSimpleHandler } from './core/error-handler';
import { ChannelsChannels } from '../../shared/ipc_channels.definitions';
import { type ChannelStatusEvent, type ChannelType } from '../../shared';
import { listChannelCatalog } from '../../shared';
import type { ChannelRegistry } from '../channels';
import type { LoggerService } from '../shared';

export interface ChannelsIpcDeps {
	logger: LoggerService;
	channelRegistry: ChannelRegistry;
}

export class ChannelsIpc implements IpcModule<ChannelsIpcDeps> {
	readonly name = 'channels';

	register({ logger, channelRegistry }: ChannelsIpcDeps, _eventBus: EventBus): void {

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
