import type { ChannelStatusEvent } from '../../shared/channels';
import { ChannelsChannels } from '../../shared/ipc-channels';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { AssistantService } from '../service';
import { TelegramAdapter, type TelegramAdapterOptions } from './telegram';
import type {
	ChannelAdapter,
	ChannelInboundMessage,
	ChannelOutboundMessage,
	ChannelStatusUpdate,
} from './types';

export interface ChannelRegistryOptions {
	telegram?: TelegramAdapterOptions;
}

export interface ChannelRegistryDependencies {
	logger: LoggerService;
	eventBus: EventBus;
	assistantService?: AssistantService;
}

export class ChannelRegistry {
	private telegram: ChannelAdapter | null = null;
	private telegramOptions: TelegramAdapterOptions | null = null;
	private readonly statusCache = new Map<'telegram', ChannelStatusEvent>();

	constructor(private readonly dependencies: ChannelRegistryDependencies) {}

	configure(options: ChannelRegistryOptions): void {
		if (options.telegram) {
			this.telegramOptions = {
				token: options.telegram.token,
				allowFrom: options.telegram.allowFrom,
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
		this.dependencies.logger.info('ChannelRegistry', 'Received telegram message', {
			from: message.from,
			chatId: message.chatId,
		});

		if (!this.dependencies.assistantService) return;

		try {
			const reply = await this.dependencies.assistantService.send(message.text);
			await this.send({ type: 'telegram', to: message.chatId, text: reply });
		} catch (error) {
			this.dependencies.logger.error('ChannelRegistry', 'Telegram assistant reply failed', error);
		}
	}
}
