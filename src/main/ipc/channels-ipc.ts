import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { ChannelsChannels } from '../../shared/ipc-channels';
import type { ChannelStatusEvent, TelegramChannelProperties } from '../../shared/channels';

function normalizeTelegramConfig(config: TelegramChannelProperties): TelegramChannelProperties {
	return {
		token: config.token.trim(),
		allowFrom: config.allowFrom.map((value) => String(value).trim()).filter(Boolean),
	};
}

export class ChannelsIpc implements IpcModule {
	readonly name = 'channels';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const store = container.get('store');
		const channelRegistry = container.get('channelRegistry');

		ipcMain.handle(
			ChannelsChannels.getTelegramConfig,
			wrapSimpleHandler((): TelegramChannelProperties => {
				return store.getTelegramChannel();
			}, ChannelsChannels.getTelegramConfig)
		);

		ipcMain.handle(
			ChannelsChannels.saveTelegramConfig,
			wrapSimpleHandler((config: TelegramChannelProperties): TelegramChannelProperties => {
				const next = store.setTelegramChannel(normalizeTelegramConfig(config));
				channelRegistry.configure({ telegram: next });
				return next;
			}, ChannelsChannels.saveTelegramConfig)
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
				await channelRegistry.startTelegram(store.getTelegramChannel());
				return channelRegistry.getStatus();
			}, ChannelsChannels.startTelegram)
		);

		ipcMain.handle(
			ChannelsChannels.stopTelegram,
			wrapSimpleHandler(async (): Promise<void> => {
				await channelRegistry.stopTelegram();
			}, ChannelsChannels.stopTelegram)
		);

		ipcMain.handle(
			ChannelsChannels.restartTelegram,
			wrapSimpleHandler(async (): Promise<ChannelStatusEvent | undefined> => {
				await channelRegistry.restartTelegram(store.getTelegramChannel());
				return channelRegistry.getStatus();
			}, ChannelsChannels.restartTelegram)
		);

		logger.info('ChannelsIpc', `Registered ${this.name} module`);
	}
}
