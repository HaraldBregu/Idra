import type { ChannelStatusEvent, ChannelType, StoredBotProvider } from '../../../shared';
import { AppChannels } from '../../../shared/ipc_channels_definitions';
import type { EventBus } from '../event_bus';
import type { LoggerService } from '../../shared';
import type { Agent } from '../../agent/agent';
import { listProviders } from '../settings_store';
import { canReceive } from './channels_security';
import type {
	ChannelAdapter,
	ChannelInboundMessage,
	ChannelMessageReceipt,
	ChannelOutboundMessage,
	ChannelStatusUpdate,
} from './channels_types';

// Fixed UUID so every channel message reuses the same agent session.
const CHANNEL_SESSION_ID = '7c1f41d3-9b2a-4e8f-b5c6-2d0a8e4f6a91';
const CHANNEL_START_REPLY = "Hi! I'm connected. Send me a message and I'll reply.";

export interface ChannelRegistryDependencies {
	logger: LoggerService;
	eventBus: EventBus;
	agentService?: Agent;
}

export interface ChannelRegistry {
	start(channel: ChannelType): Promise<void>;
	stop(channel: ChannelType): Promise<void>;
	restart(channel: ChannelType): Promise<void>;
	send(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
	getStatus(channel?: ChannelType): ChannelStatusEvent | undefined;
	destroy(): void;
}

export function createChannelRegistry(dependencies: ChannelRegistryDependencies): ChannelRegistry {
	const { logger, eventBus, agentService } = dependencies;
	const adapters = new Map<ChannelType, ChannelAdapter>();
	const statusCache = new Map<ChannelType, ChannelStatusEvent>();

	async function createAdapter(channel: ChannelType, token: string): Promise<ChannelAdapter> {
		if (channel === 'telegram') {
			const { createTelegramAdapter } = await import('./channels_telegram');
			return createTelegramAdapter({ token });
		}
		const { createDiscordAdapter } = await import('./channels_discord');
		return createDiscordAdapter({ token });
	}

	function handleStatus(channel: ChannelType, update: ChannelStatusUpdate): void {
		const event: ChannelStatusEvent = {
			type: channel,
			status: update.status,
			pairingCode: update.pairingCode,
			error: update.error,
			timestamp: Date.now(),
		};
		statusCache.set(channel, event);
		eventBus.emit('channel:status', event);
		eventBus.broadcast(AppChannels.channelsStatusChanged, event);
	}

	async function handleMessage(message: ChannelInboundMessage): Promise<void> {
		const config = getChannelConfig(message.channel);
		const decision = canReceive(message, config);
		if (!decision.allowed) {
			logger.info('ChannelRegistry', 'Dropped channel message', {
				channel: message.channel,
				chatType: message.chatType,
				reason: decision.reason,
			});
			return;
		}
		const reply = (text: string) =>
			send({
				channel: message.channel,
				accountId: message.accountId,
				to: message.chatId,
				threadId: message.threadId,
				replyToMessageId: message.messageId,
				text,
				idempotencyKey: `${message.idempotencyKey}:reply`,
			});

		try {
			if (message.text.startsWith('/')) {
				const command = message.text.split(/\s+/)[0].slice(1).split('@')[0].toLowerCase();
				if (command === 'start') await reply(CHANNEL_START_REPLY);
				return;
			}
			if (!agentService) return;

			eventBus.emit('channel:route', {
				channel: message.channel,
				accountId: message.accountId,
				to: message.chatId,
				threadId: message.threadId,
				replyToMessageId: message.messageId,
				chatType: message.chatType,
			});
			const response = await agentService.send(message.text, 'channels', {
				category: 'bot',
				interactive: false,
				sessionId: CHANNEL_SESSION_ID,
			});
			await reply(response);
			logger.info('ChannelRegistry', 'Replied to channel message', {
				channel: message.channel,
				chatType: message.chatType,
			});
		} catch (error) {
			logger.error('ChannelRegistry', 'Channel agent reply failed', error);
		}
	}

	async function start(channel: ChannelType): Promise<void> {
		if (adapters.has(channel)) return;

		const config = getChannelConfig(channel);
		if (config.enabled === false) {
			logger.warn('ChannelRegistry', `${channel} channel is disabled`);
			return;
		}
		if (!config.token.trim()) {
			logger.warn('ChannelRegistry', `${channel} channel is not configured`);
			return;
		}

		const adapter = await createAdapter(channel, config.token.trim());
		adapter.onStatus((update) => handleStatus(channel, update));
		adapter.onMessage((message) => {
			void handleMessage(message);
		});

		await adapter.start();
		adapters.set(channel, adapter);
		logger.info('ChannelRegistry', `Started ${channel} channel`);
	}

	async function stop(channel: ChannelType): Promise<void> {
		const adapter = adapters.get(channel);
		if (!adapter) return;
		try {
			await adapter.stop();
		} finally {
			adapters.delete(channel);
		}
	}

	async function send(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt> {
		const adapter = adapters.get(message.channel);
		if (!adapter) {
			throw new Error(`${message.channel} channel is not running`);
		}
		return adapter.send(message);
	}

	return {
		start,
		stop,
		async restart(channel) {
			await stop(channel);
			await start(channel);
		},
		send,
		getStatus(channel = 'telegram') {
			return statusCache.get(channel);
		},
		destroy() {
			for (const channel of adapters.keys()) {
				void stop(channel);
			}
		},
	};
}
