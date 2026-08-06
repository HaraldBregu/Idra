import { Bot, GrammyError, HttpError } from 'grammy';
import { sendDurableMessageBatch } from '../channels_batch';
import type {
	ChannelAdapter,
	ChannelChatType,
	ChannelInboundHandler,
	ChannelInboundMessage,
	ChannelMessageReceipt,
	ChannelOutboundMessage,
	ChannelStatusHandler,
	ChannelStatusUpdate,
} from '../channels_types';
import { registerVoiceHandler } from './voice';

export interface TelegramAdapterOptions {
	token: string;
	accountId?: string;
}

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
const TELEGRAM_HEALTH_CHECK_INTERVAL_MS = 60_000;
const TELEGRAM_RECONNECT_INITIAL_DELAY_MS = 2_000;
const TELEGRAM_RECONNECT_MAX_DELAY_MS = 60_000;

export function createTelegramAdapter(options: TelegramAdapterOptions): ChannelAdapter {
	const token = options.token.trim();
	if (!token) throw new Error('Telegram bot token is required');
	const accountId = options.accountId?.trim() || 'default';

	const seenMessages = new Set<string>();
	const messageHandlers = new Set<ChannelInboundHandler>();
	const statusHandlers = new Set<ChannelStatusHandler>();
	let healthTimer: NodeJS.Timeout | null = null;
	let reconnectTimer: NodeJS.Timeout | null = null;
	let reconnectDelayMs = TELEGRAM_RECONNECT_INITIAL_DELAY_MS;
	let stopping = false;
	let bot = createBot();

	function createBot(): Bot {
		const next = new Bot(token);
		registerVoiceHandler(next);
		registerTextHandler(next, accountId, (message) => {
			if (seenMessages.has(message.idempotencyKey)) return;
			seenMessages.add(message.idempotencyKey);
			for (const handler of messageHandlers) handler(message);
		});
		next.catch((error) => {
			const reason = error.error instanceof Error ? error.error.message : String(error.error);
			console.error('[telegram] handler error:', reason);
			emitStatus({ status: 'error', error: reason });
		});
		return next;
	}

	function emitStatus(update: ChannelStatusUpdate): void {
		for (const handler of statusHandlers) handler(update);
	}

	function startHealthCheck(): void {
		clearHealthCheck();
		healthTimer = setInterval(() => {
			void runHealthCheck();
		}, TELEGRAM_HEALTH_CHECK_INTERVAL_MS);
		healthTimer.unref?.();
	}

	async function runHealthCheck(): Promise<void> {
		if (stopping) return;
		try {
			await bot.api.getMe();
			reconnectDelayMs = TELEGRAM_RECONNECT_INITIAL_DELAY_MS;
		} catch (error) {
			const reason =
				error instanceof GrammyError
					? `GrammyError ${error.error_code}: ${error.description}`
					: error instanceof HttpError
						? `HttpError: ${error.message}`
						: String(error);
			console.error('[telegram] health check failed:', reason);
			emitStatus({ status: 'error', error: reason });
			await forceReconnect();
		}
	}

	async function forceReconnect(): Promise<void> {
		clearHealthCheck();
		try {
			await bot.stop();
		} catch {
			// Bot may already be stopped after a polling failure.
		}
		bot = createBot();
		scheduleReconnect();
	}

	function scheduleReconnect(): void {
		if (stopping || reconnectTimer) return;
		const delay = reconnectDelayMs;
		reconnectDelayMs = Math.min(reconnectDelayMs * 2, TELEGRAM_RECONNECT_MAX_DELAY_MS);
		emitStatus({ status: 'connecting' });
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			void start().catch((error: unknown) => {
				const reason = error instanceof Error ? error.message : String(error);
				console.error('[telegram] reconnect failed:', reason);
				emitStatus({ status: 'error', error: reason });
				scheduleReconnect();
			});
		}, delay);
		reconnectTimer.unref?.();
	}

	function clearHealthCheck(): void {
		if (!healthTimer) return;
		clearInterval(healthTimer);
		healthTimer = null;
	}

	function clearTimers(): void {
		clearHealthCheck();
		if (!reconnectTimer) return;
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}

	async function start(): Promise<void> {
		stopping = false;
		reconnectDelayMs = TELEGRAM_RECONNECT_INITIAL_DELAY_MS;
		emitStatus({ status: 'connecting' });

		bot.start({ drop_pending_updates: true }).catch((error: unknown) => {
			const reason = error instanceof Error ? error.message : String(error);
			console.error('[telegram] polling stopped:', reason);
			emitStatus({ status: 'error', error: reason });
			scheduleReconnect();
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		emitStatus({ status: 'connected' });
		startHealthCheck();
	}

	return {
		start,
		async stop() {
			stopping = true;
			clearTimers();
			try {
				await bot.stop();
			} catch (error) {
				console.error('[telegram] stop failed:', error);
			}
			emitStatus({ status: 'disconnected' });
		},
		send(message) {
			return sendMessage(bot, {
				...message,
				accountId: message.accountId ?? accountId,
			});
		},
		onMessage(handler) {
			messageHandlers.add(handler);
			return () => {
				messageHandlers.delete(handler);
			};
		},
		onStatus(handler) {
			statusHandlers.add(handler);
			return () => {
				statusHandlers.delete(handler);
			};
		},
	};
}

function registerTextHandler(bot: Bot, accountId: string, emit: ChannelInboundHandler): void {
	bot.on('message:text', (ctx) => {
		const text = ctx.message.text;
		if (!text) return;

		const chatId = String(ctx.chat.id);
		const threadId = ctx.message.message_thread_id
			? String(ctx.message.message_thread_id)
			: undefined;
		const messageId = String(ctx.message.message_id);
		const message: ChannelInboundMessage = {
			channel: 'telegram',
			accountId,
			senderId: String(ctx.from?.id ?? ''),
			senderName:
				[ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') ||
				ctx.from?.username,
			chatId,
			chatType: getChatType(ctx.chat.type, threadId),
			messageId,
			threadId,
			text,
			idempotencyKey: ['telegram', accountId, chatId, threadId, messageId]
				.filter(Boolean)
				.join(':'),
			receivedAt: Date.now(),
		};
		emit(message);
	});
}

function getChatType(type: string | undefined, threadId: string | undefined): ChannelChatType {
	if (threadId) return 'thread';
	if (type === 'group' || type === 'supergroup') return 'group';
	if (type === 'channel') return 'channel';
	return 'dm';
}

async function sendMessage(
	bot: Bot,
	message: ChannelOutboundMessage
): Promise<ChannelMessageReceipt> {
	return sendDurableMessageBatch(
		message,
		async (text) => {
			const sent = await bot.api.sendMessage(message.to, text, {
				message_thread_id: message.threadId ? Number(message.threadId) : undefined,
				reply_parameters: message.replyToMessageId
					? { message_id: Number(message.replyToMessageId) }
					: undefined,
			});
			return {
				platformMessageId: String(sent.message_id),
				timestamp: Date.now(),
			};
		},
		{ maxLength: TELEGRAM_MAX_MESSAGE_LENGTH }
	);
}
