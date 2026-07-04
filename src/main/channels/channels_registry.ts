import type { ChannelStatusEvent, ChannelType } from '../../shared';
import { ChannelsChannels } from '../../shared/ipc_channels_definitions';
import type { EventBus } from '../app/event_bus';
import type { LoggerService } from '../shared';
import type { Agent } from '../agent/agent';
import { getChannelConfig } from './channels_store';
import { canReceive } from './channels_security';
import type {
	ChannelAdapter,
	ChannelInboundMessage,
	ChannelMessageReceipt,
	ChannelOutboundMessage,
	ChannelStatusUpdate,
} from './channels_types';

const CHANNEL_SESSION_ID = 'channel';

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
		eventBus.broadcast(ChannelsChannels.statusChanged, event);
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
		if (!agentService) return;

		try {
			eventBus.emit('channel:route', {
				channel: message.channel,
				accountId: message.accountId,
				to: message.chatId,
				threadId: message.threadId,
				replyToMessageId: message.messageId,
				chatType: message.chatType,
			});
			const reply = await agentService.send(
				message.text,
				'channels',
				config.isolatedSession ? { category: 'channel', sessionId: CHANNEL_SESSION_ID } : {}
			);
			await send({
				channel: message.channel,
				accountId: message.accountId,
				to: message.chatId,
				threadId: message.threadId,
				replyToMessageId: message.messageId,
				text: reply,
				idempotencyKey: `${message.idempotencyKey}:reply`,
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
