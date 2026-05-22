import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { ChannelsChannels } from '../../shared/ipc-channels';
import {
	type Channel,
	type ChannelStatusEvent,
	type ChannelType,
	type TelegramChannelProperties,
} from '../../shared/channels';
import { listChannelCatalog, normalizeChannelId } from '../../shared/channels';

function normalizeTelegramConfig(config: TelegramChannelProperties): TelegramChannelProperties {
	const normalized: TelegramChannelProperties = {
		token: config.token.trim(),
		allowFrom: config.allowFrom.map((value) => String(value).trim()).filter(Boolean),
	};
	if (config.enabled !== undefined) normalized.enabled = config.enabled;
	if (config.defaultAccountId?.trim()) normalized.defaultAccountId = config.defaultAccountId.trim();
	if (config.defaultTarget?.trim()) normalized.defaultTarget = config.defaultTarget.trim();
	if (config.dmPolicy) normalized.dmPolicy = config.dmPolicy;
	if (config.groupAllowFrom) {
		normalized.groupAllowFrom = config.groupAllowFrom
			.map((value) => String(value).trim())
			.filter(Boolean);
	}
	if (config.accounts) normalized.accounts = config.accounts;
	return normalized;
}

export class ChannelsIpc implements IpcModule {
	readonly name = 'channels';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const store = container.get('store');
		const channelRegistry = container.get('channelRegistry');

		ipcMain.handle(
			ChannelsChannels.listCatalog,
			wrapSimpleHandler(() => {
				return listChannelCatalog();
			}, ChannelsChannels.listCatalog)
		);

		ipcMain.handle(
			ChannelsChannels.getConfig,
			wrapSimpleHandler((): Channel => {
				return store.getChannel();
			}, ChannelsChannels.getConfig)
		);

		ipcMain.handle(
			ChannelsChannels.getChannelConfig,
			wrapSimpleHandler((type: ChannelType): Channel[ChannelType] => {
				return store.getChannelConfig(resolveChannelType(type));
			}, ChannelsChannels.getChannelConfig)
		);

		ipcMain.handle(
			ChannelsChannels.saveChannelConfig,
			wrapSimpleHandler(
				(type: ChannelType, config: Channel[ChannelType]): Channel[ChannelType] => {
					const channelType = resolveChannelType(type);
					const next = store.setChannelConfig(channelType, config);
					if (channelType === 'telegram') {
						channelRegistry.configure({ telegram: next as TelegramChannelProperties });
					}
					return next;
				},
				ChannelsChannels.saveChannelConfig
			)
		);

		ipcMain.handle(
			ChannelsChannels.getStatus,
			wrapSimpleHandler((type?: ChannelType): ChannelStatusEvent | undefined => {
				return channelRegistry.getStatus(type);
			}, ChannelsChannels.getStatus)
		);

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

function resolveChannelType(type: ChannelType): ChannelType {
	const channelType = normalizeChannelId(type);
	if (!channelType) throw new Error(`Unsupported channel type: ${type}`);
	return channelType;
}
