import { Bot, GrammyError, HttpError } from 'grammy';
import { normalizeTelegramTextMessage, registerTextHandler } from './receive';
import { sendTelegramDurable } from './send';
import {
	TELEGRAM_HEALTH_CHECK_INTERVAL_MS,
	TELEGRAM_RECONNECT_INITIAL_DELAY_MS,
	TELEGRAM_RECONNECT_MAX_DELAY_MS,
} from './constants';
import type { TelegramAdapterOptions } from './types';
import type {
	ChannelAdapter,
	ChannelInboundHandler,
	ChannelInboundMessage,
	ChannelMessageReceipt,
	ChannelOutboundMessage,
	ChannelStatusHandler,
	ChannelStatusUpdate,
} from '../types';

export class TelegramAdapter implements ChannelAdapter {
	private bot: Bot;
	private readonly token: string;
	private readonly accountId: string;
	private readonly seenMessages = new Set<string>();
	private readonly messageHandlers = new Set<ChannelInboundHandler>();
	private readonly statusHandlers = new Set<ChannelStatusHandler>();
	private healthTimer: NodeJS.Timeout | null = null;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private reconnectDelayMs = TELEGRAM_RECONNECT_INITIAL_DELAY_MS;
	private stopping = false;

	constructor(options: TelegramAdapterOptions) {
		this.token = options.token.trim();
		this.accountId = options.accountId?.trim() || 'default';
		if (!this.token) {
			throw new Error('Telegram bot token is required');
		}
		this.bot = this.createBot();
	}

	onMessage(handler: ChannelInboundHandler): () => void {
		this.messageHandlers.add(handler);
		return () => {
			this.messageHandlers.delete(handler);
		};
	}

	onStatus(handler: ChannelStatusHandler): () => void {
		this.statusHandlers.add(handler);
		return () => {
			this.statusHandlers.delete(handler);
		};
	}

	async send(message: ChannelOutboundMessage): Promise<void> {
		await this.deliver(message);
	}

	async deliver(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt> {
		return sendTelegramDurable(this.bot, {
			...message,
			accountId: message.accountId ?? this.accountId,
		});
	}

	async start(): Promise<void> {
		this.stopping = false;
		this.reconnectDelayMs = TELEGRAM_RECONNECT_INITIAL_DELAY_MS;
		this.emitStatus({ status: 'connecting' });

		this.bot.start({ drop_pending_updates: true }).catch((error: unknown) => {
			const reason = error instanceof Error ? error.message : String(error);
			console.error('[telegram] polling stopped:', reason);
			this.emitStatus({ status: 'error', error: reason });
			this.scheduleReconnect();
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		this.emitStatus({ status: 'connected' });
		this.startHealthCheck();
	}

	async stop(): Promise<void> {
		this.stopping = true;
		this.clearTimers();
		try {
			await this.bot.stop();
		} catch (error) {
			console.error('[telegram] stop failed:', error);
		}
		this.emitStatus({ status: 'disconnected' });
	}

	private createBot(): Bot {
		const bot = new Bot(this.token);
		registerTextHandler(bot, (payload) => {
			const normalized = normalizeTelegramTextMessage({
				accountId: this.accountId,
				...payload,
			});
			if (this.seenMessages.has(normalized.idempotencyKey)) return;
			this.seenMessages.add(normalized.idempotencyKey);
			const message: ChannelInboundMessage = {
				type: 'telegram',
				from: normalized.senderId,
				chatId: normalized.targetId,
				text: normalized.text,
				messageId: normalized.messageId,
				threadId: normalized.threadId,
				chatType: normalized.chatType,
				provenance: normalized.provenance,
			};
			for (const handler of this.messageHandlers) handler(message);
		});
		bot.catch((error) => {
			const reason = error.error instanceof Error ? error.error.message : String(error.error);
			console.error('[telegram] handler error:', reason);
			this.emitStatus({ status: 'error', error: reason });
		});
		return bot;
	}

	private emitStatus(update: ChannelStatusUpdate): void {
		for (const handler of this.statusHandlers) handler(update);
	}

	private startHealthCheck(): void {
		this.clearHealthCheck();
		this.healthTimer = setInterval(() => {
			void this.runHealthCheck();
		}, TELEGRAM_HEALTH_CHECK_INTERVAL_MS);
		this.healthTimer.unref?.();
	}

	private async runHealthCheck(): Promise<void> {
		if (this.stopping) return;
		try {
			await this.bot.api.getMe();
			this.reconnectDelayMs = TELEGRAM_RECONNECT_INITIAL_DELAY_MS;
		} catch (error) {
			const reason =
				error instanceof GrammyError
					? `GrammyError ${error.error_code}: ${error.description}`
					: error instanceof HttpError
						? `HttpError: ${error.message}`
						: String(error);
			console.error('[telegram] health check failed:', reason);
			this.emitStatus({ status: 'error', error: reason });
			await this.forceReconnect();
		}
	}

	private async forceReconnect(): Promise<void> {
		this.clearHealthCheck();
		try {
			await this.bot.stop();
		} catch {
			// Bot may already be stopped after a polling failure.
		}
		this.bot = this.createBot();
		this.scheduleReconnect();
	}

	private scheduleReconnect(): void {
		if (this.stopping || this.reconnectTimer) return;
		const delay = this.reconnectDelayMs;
		this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, TELEGRAM_RECONNECT_MAX_DELAY_MS);
		this.emitStatus({ status: 'connecting' });
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			void this.start().catch((error: unknown) => {
				const reason = error instanceof Error ? error.message : String(error);
				console.error('[telegram] reconnect failed:', reason);
				this.emitStatus({ status: 'error', error: reason });
				this.scheduleReconnect();
			});
		}, delay);
		this.reconnectTimer.unref?.();
	}

	private clearHealthCheck(): void {
		if (!this.healthTimer) return;
		clearInterval(this.healthTimer);
		this.healthTimer = null;
	}

	private clearTimers(): void {
		this.clearHealthCheck();
		if (!this.reconnectTimer) return;
		clearTimeout(this.reconnectTimer);
		this.reconnectTimer = null;
	}
}
