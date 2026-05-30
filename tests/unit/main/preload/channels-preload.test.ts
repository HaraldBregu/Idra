import { ipcRenderer } from 'electron';
import { channels } from '../../../../src/preload';
import {
	CHANNEL_CATALOG_BY_ID,
	CHANNEL_DEFAULT_ACCOUNT_ID,
	CHANNEL_DEFAULT_DM_POLICY,
	type Channel,
	type ChannelStatusEvent,
	type TelegramChannelProperties,
} from '../../../../src/shared/channels';
import { ChannelsChannels } from '../../../../src/shared/ipc-channels';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

const telegramConfig: TelegramChannelProperties = {
	token: 'telegram-token',
	allowFrom: ['123'],
	enabled: true,
	defaultAccountId: CHANNEL_DEFAULT_ACCOUNT_ID,
	dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
	groupAllowFrom: ['-100'],
};

const channelConfig = {
	telegram: telegramConfig,
	discord: {
		token: 'discord-token',
		allowFrom: [],
		enabled: false,
		defaultAccountId: CHANNEL_DEFAULT_ACCOUNT_ID,
		dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
		groupAllowFrom: [],
	},
} as Channel;

const status: ChannelStatusEvent = {
	type: 'telegram',
	status: 'connected',
	timestamp: 1770000000000,
};

describe('channels preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
		mockedIpcRenderer.on.mockReset();
		mockedIpcRenderer.removeListener.mockReset();
	});

	it('invokes channel config methods through typed IPC channels', async () => {
		const catalog = [CHANNEL_CATALOG_BY_ID.telegram];

		const cases = [
			{
				run: () => channels.listCatalog(),
				channel: ChannelsChannels.listCatalog,
				args: [],
				data: catalog,
			},
			{
				run: () => channels.getConfig(),
				channel: ChannelsChannels.getConfig,
				args: [],
				data: channelConfig,
			},
			{
				run: () => channels.getChannelConfig('telegram'),
				channel: ChannelsChannels.getChannelConfig,
				args: ['telegram'],
				data: telegramConfig,
			},
			{
				run: () => channels.saveChannelConfig('telegram', telegramConfig),
				channel: ChannelsChannels.saveChannelConfig,
				args: ['telegram', telegramConfig],
				data: telegramConfig,
			},
			{
				run: () => channels.getTelegramConfig(),
				channel: ChannelsChannels.getTelegramConfig,
				args: [],
				data: telegramConfig,
			},
			{
				run: () => channels.saveTelegramConfig(telegramConfig),
				channel: ChannelsChannels.saveTelegramConfig,
				args: [telegramConfig],
				data: telegramConfig,
			},
		] as const;

		for (const item of cases) {
			mockedIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: item.data });

			await expect(item.run()).resolves.toEqual(item.data);
			expect(mockedIpcRenderer.invoke).toHaveBeenLastCalledWith(item.channel, ...item.args);
		}

		await expect(Promise.resolve(catalog[0].setupFields)).resolves.toContain('dmPolicy');
	});

	it('invokes channel runtime methods through typed IPC channels', async () => {
		const cases = [
			{
				run: () => channels.getStatus('telegram'),
				channel: ChannelsChannels.getStatus,
				args: ['telegram'],
				data: status,
			},
			{
				run: () => channels.getTelegramStatus(),
				channel: ChannelsChannels.getTelegramStatus,
				args: [],
				data: status,
			},
			{
				run: () => channels.startTelegram(),
				channel: ChannelsChannels.startTelegram,
				args: [],
				data: status,
			},
			{
				run: () => channels.stopTelegram(),
				channel: ChannelsChannels.stopTelegram,
				args: [],
				data: undefined,
			},
			{
				run: () => channels.restartTelegram(),
				channel: ChannelsChannels.restartTelegram,
				args: [],
				data: status,
			},
		] as const;

		for (const item of cases) {
			mockedIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: item.data });

			await expect(item.run()).resolves.toEqual(item.data);
			expect(mockedIpcRenderer.invoke).toHaveBeenLastCalledWith(item.channel, ...item.args);
		}
	});

	it('subscribes and unsubscribes from channel status events', () => {
		let ipcListener: Parameters<typeof mockedIpcRenderer.on>[1] | null = null;
		mockedIpcRenderer.on.mockImplementation((_channel, listener) => {
			ipcListener = listener;
			return mockedIpcRenderer;
		});
		mockedIpcRenderer.removeListener.mockReturnValue(mockedIpcRenderer);
		const callback = jest.fn();

		const unsubscribe = channels.onStatusChanged(callback);
		ipcListener?.({} as Electron.IpcRendererEvent, status);
		unsubscribe();

		expect(mockedIpcRenderer.on).toHaveBeenCalledWith(
			ChannelsChannels.statusChanged,
			expect.any(Function)
		);
		expect(callback).toHaveBeenCalledWith(status);
		expect(mockedIpcRenderer.removeListener).toHaveBeenCalledWith(
			ChannelsChannels.statusChanged,
			ipcListener
		);
	});
});
