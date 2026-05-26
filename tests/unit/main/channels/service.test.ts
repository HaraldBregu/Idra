const mockStoreInstances: Array<{
	data: Map<string, unknown>;
	get: jest.Mock;
	set: jest.Mock;
	delete: jest.Mock;
}> = [];

jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		const store = {
			data,
			get: jest.fn((key: string) => data.get(key)),
			set: jest.fn((key: string, value: unknown) => {
				data.set(key, value);
			}),
			delete: jest.fn((key: string) => {
				data.delete(key);
			}),
		};
		mockStoreInstances.push(store);
		return store;
	});
});

import Store from 'electron-store';
import { ChannelsService } from '../../../../src/main/channels';
import { CHANNEL_PROVIDER_IDS, type Channel } from '../../../../src/shared/channels';
import { makeLogger } from '../test-helpers';

const MockStore = Store as jest.MockedClass<typeof Store>;

function latestStore() {
	const store = mockStoreInstances.at(-1);
	if (!store) throw new Error('No mocked store instance');
	return store;
}

describe('ChannelsService', () => {
	beforeEach(() => {
		MockStore.mockClear();
		mockStoreInstances.length = 0;
	});

	it('uses a dedicated channels Electron Store', () => {
		new ChannelsService(makeLogger());

		expect(MockStore).toHaveBeenCalledWith({
			name: 'channels',
			accessPropertiesByDotNotation: false,
		});
	});

	it('hydrates every supported channel provider with normalized defaults', () => {
		const service = new ChannelsService(makeLogger());

		const channel = service.getChannel();

		expect(Object.keys(channel).sort()).toEqual([...CHANNEL_PROVIDER_IDS].sort());
		expect(channel.telegram).toMatchObject({
			token: '',
			allowFrom: [],
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: 'allowlist',
		});
		expect(channel.slack.accounts?.default).toMatchObject({
			label: 'slack default',
			enabled: false,
			token: '',
			allowFrom: [],
			groupAllowFrom: [],
			dmPolicy: 'allowlist',
		});
	});

	it('reads stored settings and normalizes them before returning', () => {
		const logger = makeLogger();
		const service = new ChannelsService(logger);
		latestStore().data.set('telegram', {
			token: 'telegram-token',
			allowFrom: [' user-1 ', 'user-1', 'user-2'],
			groupAllowFrom: [' group-1 '],
		});
		latestStore().data.set('slack', {
			enabled: true,
			accounts: {
				default: {
					label: 'Workspace bot',
					token: 'xoxb-token',
					allowFrom: ['U1', ' U1 ', 'U2'],
				},
			},
		});

		const channel = service.getChannel();

		expect(channel.telegram).toMatchObject({
			token: 'telegram-token',
			allowFrom: ['user-1', 'user-2'],
			groupAllowFrom: ['group-1'],
		});
		expect(channel.slack).toMatchObject({
			enabled: true,
			defaultAccountId: 'default',
			accounts: {
				default: expect.objectContaining({
					label: 'Workspace bot',
					token: 'xoxb-token',
					allowFrom: ['U1', 'U2'],
				}),
			},
		});
		expect(logger.debug).toHaveBeenCalledWith('ChannelsService', 'Read channel settings', undefined);
	});

	it('writes normalized channel config and lists configured channels', () => {
		const service = new ChannelsService(makeLogger());

		const saved = service.setChannelConfig('slack', {
			enabled: true,
			defaultAccountId: 'default',
			accounts: {
				default: {
					label: 'Workspace bot',
					enabled: true,
					token: 'xoxb-token',
					serverUrl: 'https://workspace.slack.com',
					defaultTarget: 'C123',
					allowFrom: ['U1', 'U1', ' U2 '],
					groupAllowFrom: ['C123'],
					dmPolicy: 'allowlist',
				},
			},
		});

		expect(saved).toMatchObject({
			enabled: true,
			accounts: {
				default: expect.objectContaining({
					label: 'Workspace bot',
					token: 'xoxb-token',
					allowFrom: ['U1', 'U2'],
				}),
			},
		});
		expect(latestStore().set).toHaveBeenCalledWith(
			'slack',
			expect.objectContaining({
				accounts: {
					default: expect.objectContaining({ token: 'xoxb-token', allowFrom: ['U1', 'U2'] }),
				},
			})
		);
		expect(service.getChannel().telegram).toMatchObject({ token: '', allowFrom: [] });
		expect(service.listConfiguredChannels()).toEqual(['slack']);
	});

	it('updates and deletes a channel config without touching other channels', () => {
		const service = new ChannelsService(makeLogger());
		service.setChannelConfig('telegram', {
			token: 'telegram-token',
			allowFrom: ['123'],
			enabled: true,
			defaultAccountId: 'default',
		});
		service.setChannelProperties('telegram', { allowFrom: ['456'] });

		expect(service.getTelegramChannel()).toMatchObject({
			token: 'telegram-token',
			allowFrom: ['456'],
		});
		const deleted = service.deleteChannelConfig('telegram');

		expect(latestStore().delete).toHaveBeenCalledWith('telegram');
		expect(deleted).toMatchObject({ token: '', allowFrom: [], enabled: false });
		expect(service.listConfiguredChannels()).toEqual([]);
	});

	it('validates settings before writing and reports failures through the logger', () => {
		const logger = makeLogger();
		const service = new ChannelsService(logger);

		expect(() =>
			service.setChannelConfig('telegram', {
				token: 'token',
				allowFrom: [123],
			} as unknown as Channel['telegram'])
		).toThrow(/allowFrom must be an array of strings/);

		expect(latestStore().set).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith('ChannelsService', 'Invalid channel config', {
			type: 'telegram',
			error: 'allowFrom must be an array of strings',
		});
	});

	it('logs invalid stored values during normalization', () => {
		const logger = makeLogger();
		const service = new ChannelsService(logger);
		latestStore().data.set('telegram', 'not-a-config');

		expect(service.getChannelConfig('telegram')).toMatchObject({ token: '', allowFrom: [] });
		expect(logger.warn).toHaveBeenCalledWith('ChannelsService', 'Invalid stored channel config', {
			type: 'telegram',
		});
	});

	it('logs persistence failures for reads, writes, and deletes', () => {
		const logger = makeLogger();
		const service = new ChannelsService(logger);
		const store = latestStore();

		store.get.mockImplementationOnce(() => {
			throw new Error('read failed');
		});
		expect(() => service.getChannelConfig('telegram')).toThrow('read failed');
		expect(logger.error).toHaveBeenCalledWith('ChannelsService', 'Failed to read channel store property', {
			key: 'telegram',
			error: 'read failed',
		});

		store.set.mockImplementationOnce(() => {
			throw new Error('write failed');
		});
		expect(() =>
			service.setChannelConfig('telegram', {
				token: 'token',
				allowFrom: [],
				enabled: true,
				defaultAccountId: 'default',
			})
		).toThrow('write failed');
		expect(logger.error).toHaveBeenCalledWith('ChannelsService', 'Failed to write channel config', {
			type: 'telegram',
			error: 'write failed',
		});

		store.delete.mockImplementationOnce(() => {
			throw new Error('delete failed');
		});
		expect(() => service.deleteChannelConfig('telegram')).toThrow('delete failed');
		expect(logger.error).toHaveBeenCalledWith('ChannelsService', 'Failed to delete channel config', {
			type: 'telegram',
			error: 'delete failed',
		});
	});
});
