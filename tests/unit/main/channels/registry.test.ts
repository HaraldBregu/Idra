import type { ChannelInboundMessage, ChannelStatusUpdate } from '../../../../src/main/channels';
import { ChannelRegistry } from '../../../../src/main/channels/registry';
import { ChannelsChannels } from '../../../../src/shared/ipc-channels';

jest.mock('../../../../src/main/channels/telegram', () => {
	class MockTelegramAdapter {
		static instances: MockTelegramAdapter[] = [];

		readonly start = jest.fn().mockResolvedValue(undefined);
		readonly stop = jest.fn().mockResolvedValue(undefined);
		readonly send = jest.fn().mockResolvedValue(undefined);
		readonly statusHandlers = new Set<(update: ChannelStatusUpdate) => void>();
		readonly messageHandlers = new Set<(message: ChannelInboundMessage) => void>();

		constructor(readonly options: unknown) {
			MockTelegramAdapter.instances.push(this);
		}

		onStatus(handler: (update: ChannelStatusUpdate) => void): () => void {
			this.statusHandlers.add(handler);
			return () => this.statusHandlers.delete(handler);
		}

		onMessage(handler: (message: ChannelInboundMessage) => void): () => void {
			this.messageHandlers.add(handler);
			return () => this.messageHandlers.delete(handler);
		}

		emitStatus(update: ChannelStatusUpdate): void {
			for (const handler of this.statusHandlers) handler(update);
		}

		emitMessage(message: ChannelInboundMessage): void {
			for (const handler of this.messageHandlers) handler(message);
		}
	}

	return { TelegramAdapter: MockTelegramAdapter };
});

type MockTelegramAdapterInstance = {
	options: unknown;
	start: jest.Mock<Promise<void>, []>;
	stop: jest.Mock<Promise<void>, []>;
	send: jest.Mock<Promise<void>, [unknown]>;
	emitStatus(update: ChannelStatusUpdate): void;
	emitMessage(message: ChannelInboundMessage): void;
};

function getMockTelegramInstances(): MockTelegramAdapterInstance[] {
	const { TelegramAdapter } = jest.requireMock('../../../../src/main/channels/telegram') as {
		TelegramAdapter: { instances: MockTelegramAdapterInstance[] };
	};
	return TelegramAdapter.instances;
}

function createDependencies() {
	return {
		logger: {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		},
		eventBus: {
			emit: jest.fn(),
			broadcast: jest.fn(),
		},
		agentService: {
			send: jest.fn<Promise<string>, [string]>(),
		},
	};
}

describe('ChannelRegistry', () => {
	beforeEach(() => {
		getMockTelegramInstances().length = 0;
	});

	it('warns and does not start telegram when it is not configured', async () => {
		const dependencies = createDependencies();
		const registry = new ChannelRegistry(dependencies);

		await registry.startTelegram();

		expect(dependencies.logger.warn).toHaveBeenCalledWith(
			'ChannelRegistry',
			'Telegram channel is not configured'
		);
		expect(getMockTelegramInstances()).toHaveLength(0);
	});

	it('starts telegram with provided options and caches status updates', async () => {
		const dependencies = createDependencies();
		const registry = new ChannelRegistry(dependencies);

		await registry.startTelegram({ token: 'token', allowFrom: ['123'] });
		const [adapter] = getMockTelegramInstances();

		expect(adapter.options).toEqual({ token: 'token', allowFrom: ['123'] });
		expect(adapter.start).toHaveBeenCalledTimes(1);

		adapter.emitStatus({ status: 'connected' });

		expect(registry.getStatus()).toMatchObject({ type: 'telegram', status: 'connected' });
		expect(dependencies.eventBus.emit).toHaveBeenCalledWith(
			'channel:status',
			expect.objectContaining({ type: 'telegram', status: 'connected' })
		);
		expect(dependencies.eventBus.broadcast).toHaveBeenCalledWith(
			ChannelsChannels.statusChanged,
			expect.objectContaining({ type: 'telegram', status: 'connected' })
		);
	});

	it('does not start a second telegram adapter while one is running', async () => {
		const dependencies = createDependencies();
		const registry = new ChannelRegistry(dependencies);

		await registry.startTelegram({ token: 'token', allowFrom: ['123'] });
		await registry.startTelegram({ token: 'other', allowFrom: [] });

		expect(getMockTelegramInstances()).toHaveLength(1);
	});

	it('routes inbound telegram messages through the agent and sends the reply', async () => {
		const dependencies = createDependencies();
		dependencies.agentService.send.mockResolvedValue('agent reply');
		const registry = new ChannelRegistry(dependencies);

		await registry.startTelegram({ token: 'token', allowFrom: ['123'] });
		const [adapter] = getMockTelegramInstances();

		adapter.emitMessage({
			type: 'telegram',
			from: '123',
			chatId: 'chat-1',
			text: 'hello',
		});
		await Promise.resolve();

		expect(dependencies.agentService.send).toHaveBeenCalledWith('hello');
		expect(adapter.send).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'telegram',
				to: 'chat-1',
				text: 'agent reply',
				accountId: 'default',
			})
		);
	});

	it('stops and replaces telegram on restart', async () => {
		const dependencies = createDependencies();
		const registry = new ChannelRegistry(dependencies);

		await registry.startTelegram({ token: 'token', allowFrom: [] });
		const [firstAdapter] = getMockTelegramInstances();

		await registry.restartTelegram({ token: 'next', allowFrom: ['1'] });
		const [, secondAdapter] = getMockTelegramInstances();

		expect(firstAdapter.stop).toHaveBeenCalledTimes(1);
		expect(secondAdapter.options).toEqual({ token: 'next', allowFrom: ['1'] });
		expect(secondAdapter.start).toHaveBeenCalledTimes(1);
	});

	it('rejects sends when telegram is not running', async () => {
		const dependencies = createDependencies();
		const registry = new ChannelRegistry(dependencies);

		await expect(registry.send({ type: 'telegram', to: 'chat-1', text: 'hello' })).rejects.toThrow(
			'Telegram channel is not running'
		);
	});

	it('normalizes aliases for registered-channel lookup', () => {
		const dependencies = createDependencies();
		const registry = new ChannelRegistry(dependencies);

		expect(registry.getPlugin('telegram')?.id).toBe('telegram');
		expect(registry.getPlugin('lark')?.id).toBe('feishu');
		expect(registry.getPlugin('google-chat')?.id).toBe('googlechat');
		expect(registry.listPlugins().map((plugin) => plugin.id)).toContain('qa-channel');
	});
});
