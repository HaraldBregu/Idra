import type { ChannelStatusEvent } from '../../shared/channels';
import { ChannelsChannels } from '../../shared/ipc-channels';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { AgentService } from '../service';
import { TelegramAdapter, type TelegramAdapterOptions } from './telegram';
import { telegramChannelPlugin } from './telegram/plugin';
import type {
	ChannelAdapter,
	ChannelInboundMessage,
	ChannelPlugin,
	ChannelOutboundMessage,
	ChannelStatusUpdate,
} from './types';
import { normalizeTelegramTextMessage } from './telegram/receive';
import type { ChannelType, TelegramChannelProperties } from '../../shared/channels';

export interface ChannelRegistryOptions {
	telegram?: TelegramAdapterOptions;
}

export interface ChannelRegistryDependencies {
	logger: LoggerService;
	eventBus: EventBus;
	agentService?: AgentService;
}

export class ChannelRegistry {
	private telegram: ChannelAdapter | null = null;
	private telegramOptions: TelegramAdapterOptions | null = null;
	private readonly plugins = new Map<ChannelType, ChannelPlugin>();
	private readonly statusCache = new Map<ChannelType, ChannelStatusEvent>();

	constructor(private readonly dependencies: ChannelRegistryDependencies) {
		this.registerPlugin(telegramChannelPlugin);
	}

	registerPlugin(plugin: ChannelPlugin): void {
		this.plugins.set(plugin.id, plugin);
	}

	listPlugins(): ChannelPlugin[] {
		return [...this.plugins.values()];
	}

	getPlugin(type: ChannelType): ChannelPlugin | undefined {
		return this.plugins.get(type);
	}

	configure(options: ChannelRegistryOptions): void {
		if (options.telegram) {
			const config = this.getTelegramConfig(options.telegram);
			const errors = telegramChannelPlugin.setup?.validate(config) ?? [];
			if (errors.length > 0) {
				throw new Error(errors.join(' '));
			}
			this.telegramOptions = {
				token: options.telegram.token,
				allowFrom: options.telegram.allowFrom,
				accountId: options.telegram.accountId,
				defaultTarget: options.telegram.defaultTarget,
			};
		}
	}

	async startTelegram(options?: TelegramAdapterOptions): Promise<void> {
		if (options) {
			this.configure({ telegram: options });
		}
		if (!this.telegramOptions) {
			this.dependencies.logger.warn('ChannelRegistry', 'Telegram channel is not configured');
			return;
		}
		if (this.telegram) return;

		const adapter = new TelegramAdapter(this.telegramOptions);
		adapter.onStatus((update) => this.handleStatus(update));
		adapter.onMessage((message) => {
			void this.handleMessage(message);
		});

		await adapter.start();
		this.telegram = adapter;
		this.dependencies.logger.info('ChannelRegistry', 'Started telegram channel');
	}

	async stopTelegram(): Promise<void> {
		if (!this.telegram) return;
		try {
			await this.telegram.stop();
		} finally {
			this.telegram = null;
		}
	}

	async restartTelegram(options?: TelegramAdapterOptions): Promise<void> {
		await this.stopTelegram();
		await this.startTelegram(options);
	}

	async send(message: ChannelOutboundMessage): Promise<void> {
		if (message.type !== 'telegram') {
			throw new Error(`Unsupported channel type: ${message.type}`);
		}
		if (!this.telegram) {
			throw new Error('Telegram channel is not running');
		}
		await this.telegram.send(message);
	}

	getStatus(): ChannelStatusEvent | undefined {
		return this.statusCache.get('telegram');
	}

	destroy(): void {
		void this.stopTelegram();
	}

	private handleStatus(update: ChannelStatusUpdate): void {
		const event: ChannelStatusEvent = {
			type: 'telegram',
			status: update.status,
			pairingCode: update.pairingCode,
			error: update.error,
			timestamp: Date.now(),
		};
		this.statusCache.set('telegram', event);
		this.dependencies.eventBus.emit('channel:status', event);
		this.dependencies.eventBus.broadcast(ChannelsChannels.statusChanged, event);
	}

	private async handleMessage(message: ChannelInboundMessage): Promise<void> {
		const plugin = this.plugins.get(message.type);
		if (!plugin) {
			this.dependencies.logger.warn('ChannelRegistry', 'Message from unregistered channel', {
				type: message.type,
			});
			return;
		}

		const accountId = message.accountId ?? 'default';
		const config = this.getChannelConfig(message.type);
		const account = plugin.config.resolveAccount(config, accountId);
		if (!account) {
			this.dependencies.logger.warn('ChannelRegistry', 'Channel account not found', {
				type: message.type,
				accountId,
			});
			return;
		}

		const normalized =
			message.type === 'telegram'
				? normalizeTelegramTextMessage({
						accountId,
						from: message.from,
						chatId: message.chatId,
						text: message.text,
						messageId: message.messageId,
						threadId: message.threadId,
						chatType: message.chatType,
						provenance: message.provenance,
					})
				: null;

		if (!normalized) return;

		const decision = plugin.security?.canReceive(normalized, account) ?? { allowed: true };
		if (!decision.allowed) {
			this.dependencies.logger.info('ChannelRegistry', 'Dropped channel message by policy', {
				type: message.type,
				reason: decision.reason,
				from: message.from,
				chatId: message.chatId,
			});
			return;
		}

		const sessionKey = plugin.threading?.getSessionKey(normalized);
		this.dependencies.logger.info('ChannelRegistry', 'Received telegram message', {
			from: message.from,
			chatId: message.chatId,
			sessionKey,
		});

		if (!this.dependencies.agentService) return;

		try {
			const reply = await this.dependencies.agentService.send(message.text);
			const target = plugin.threading?.resolveReplyTarget(message) ?? { to: message.chatId };
			await this.send({
				type: message.type,
				accountId,
				to: target.to,
				threadId: target.threadId,
				replyToMessageId: target.replyToMessageId,
				text: reply,
				idempotencyKey: `${normalized.idempotencyKey}:reply`,
			});
		} catch (error) {
			this.dependencies.logger.error('ChannelRegistry', 'Telegram agent reply failed', error);
		}
	}

	private getTelegramConfig(options: TelegramAdapterOptions): TelegramChannelProperties {
		return {
			token: options.token,
			allowFrom: [...options.allowFrom],
		};
	}

	private getChannelConfig(type: ChannelType): unknown {
		if (type === 'telegram' && this.telegramOptions) {
			return this.getTelegramConfig(this.telegramOptions);
		}
		return {};
	}
}
