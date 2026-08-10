const mockGetChannelProvider = jest.fn();
const mockGetChannelModelSelection = jest.fn();
const mockGetChannelPermissions = jest.fn();
const mockAdapterStart = jest.fn();
const mockAdapterStop = jest.fn();
const mockAdapterSend = jest.fn();
const mockAdapterOnMessage = jest.fn();
const mockAdapterOnStatus = jest.fn();
let mockInboundHandler: ((message: ChannelInboundMessage) => void) | undefined;

jest.mock('../../../../src/main/channels/channels_store', () => ({
	getChannelProvider: (...args: unknown[]) => mockGetChannelProvider(...args),
	getChannelModelSelection: (...args: unknown[]) => mockGetChannelModelSelection(...args),
	getChannelPermissions: () => mockGetChannelPermissions(),
}));

jest.mock('../../../../src/main/models/transcribe', () => ({ toText: jest.fn() }));
jest.mock('../../../../src/main/models/voice', () => ({ synthesize: jest.fn() }));

jest.mock('../../../../src/main/channels/adapters/telegram', () => ({
	createTelegramAdapter: jest.fn(() => ({
		start: mockAdapterStart,
		stop: mockAdapterStop,
		send: mockAdapterSend,
		onMessage: mockAdapterOnMessage,
		onStatus: mockAdapterOnStatus,
	})),
}));

import { createChannelRegistry } from '../../../../src/main/channels/channels_registry';
import type { Agent } from '../../../../src/main/agent/agent';
import type { ChannelInboundMessage } from '../../../../src/main/channels/channels_types';
import type { EventBus } from '../../../../src/main/event_bus';
import type { LoggerService } from '../../../../src/main/shared';

function deps(agentService?: Agent) {
	return {
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService,
		eventBus: { emit: jest.fn(), broadcast: jest.fn() } as unknown as EventBus,
		agentService,
	};
}

function inboundMessage(): ChannelInboundMessage {
	return {
		channel: 'telegram',
		accountId: 'account-1',
		senderId: 'sender-1',
		chatId: 'chat-1',
		chatType: 'dm',
		messageId: 'message-1',
		threadId: 'thread-1',
		content: { type: 'text', text: 'hello' },
		idempotencyKey: 'telegram:account-1:chat-1:thread-1:message-1',
		receivedAt: 0,
	};
}

describe('createChannelRegistry', () => {
	beforeEach(() => {
		mockGetChannelProvider.mockReturnValue({
			id: 'telegram',
			name: 'Telegram',
			baseUrl: '',
			apiKey: 'token',
			dmPolicy: 'open',
		});
		mockGetChannelModelSelection.mockReturnValue({});
		mockGetChannelPermissions.mockReturnValue({ mode: 'ask', dir: {} });
		mockAdapterStart.mockResolvedValue(undefined);
		mockAdapterStop.mockResolvedValue(undefined);
		mockAdapterSend.mockResolvedValue({
			channel: 'telegram',
			to: 'chat-1',
			status: 'sent',
			platformMessageIds: ['reply-1'],
			parts: [],
			sentAt: 0,
		});
		mockAdapterOnMessage.mockImplementation((handler) => {
			mockInboundHandler = handler;
			return jest.fn();
		});
		mockAdapterOnStatus.mockReturnValue(jest.fn());
	});

	it('returns undefined status before any channel starts', () => {
		const registry = createChannelRegistry(deps());
		expect(registry.getStatus()).toBeUndefined();
		expect(registry.getStatus('discord')).toBeUndefined();
	});

	it('throws when sending on a channel that is not running', async () => {
		const registry = createChannelRegistry(deps());
		await expect(
			registry.send({ channel: 'telegram', to: 'c1', content: { type: 'text', text: 'hi' } })
		).rejects.toThrow(/telegram channel is not running/);
	});

	it('routes an inbound chat through its derived bot session', async () => {
		const send = jest.fn().mockResolvedValue('reply');
		const registry = createChannelRegistry(deps({ send } as unknown as Agent));
		await registry.start('telegram');

		mockInboundHandler?.(inboundMessage());
		await new Promise<void>((resolve) => setImmediate(resolve));

		expect(send).toHaveBeenCalledWith('hello', 'channels', {
			category: 'bot',
			interactive: false,
			streaming: false,
			permissions: { mode: 'ask', dir: {} },
			sessionId: 'f3d5954e-564f-51e0-be2f-5058fe95561e',
		});
	});
});
