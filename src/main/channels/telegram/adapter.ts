import { Bot, GrammyError, HttpError } from 'grammy';
import { registerTelegramTextHandler } from './receive';
import { sendTelegramMessage } from './send';
import {
	TELEGRAM_HEALTH_CHECK_INTERVAL_MS,
	TELEGRAM_RECONNECT_INITIAL_DELAY_MS,
	TELEGRAM_RECONNECT_MAX_DELAY_MS,
} from './constants';
import type { TelegramAdapterOptions } from './types';
import type {
	ChannelAdapter,
	ChannelInboundHandler,
	ChannelStatusHandler,
	ChannelStatusUpdate,
} from '../types';

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
		registerTelegramTextHandler(next, accountId, (message) => {
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
			return sendTelegramMessage(bot, {
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
