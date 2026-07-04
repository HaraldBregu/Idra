import { ipcMain } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { wrapSimpleHandler } from './core/error_handler';
import { ChannelsChannels } from '../../shared/ipc_channels_definitions';
import { type Channel, type ChannelStatusEvent, type ChannelType } from '../../shared';
import { getChannels, setChannelConfig, type ChannelRegistry } from '../channels';
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
			ChannelsChannels.getConfig,
			wrapSimpleHandler((): Channel => {
				return getChannels();
			}, ChannelsChannels.getConfig)
		);

		ipcMain.handle(
			ChannelsChannels.saveChannelConfig,
			wrapSimpleHandler(<TKey extends ChannelType>(type: TKey, config: Channel[TKey]) => {
				return setChannelConfig(type, config);
			}, ChannelsChannels.saveChannelConfig)
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
			ChannelsChannels.startTelegram,
			wrapSimpleHandler(async (): Promise<ChannelStatusEvent | undefined> => {
				await channelRegistry.start('telegram');
				return channelRegistry.getStatus('telegram');
			}, ChannelsChannels.startTelegram)
		);

		ipcMain.handle(
			ChannelsChannels.stopTelegram,
			wrapSimpleHandler(async (): Promise<void> => {
				await channelRegistry.stop('telegram');
			}, ChannelsChannels.stopTelegram)
		);

		ipcMain.handle(
			ChannelsChannels.restartTelegram,
			wrapSimpleHandler(async (): Promise<ChannelStatusEvent | undefined> => {
				await channelRegistry.restart('telegram');
				return channelRegistry.getStatus('telegram');
			}, ChannelsChannels.restartTelegram)
		);

		logger.info('ChannelsIpc', `Registered ${this.name} module`);
	}
}
