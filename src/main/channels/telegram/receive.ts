import type { Bot } from 'grammy';
import type { TelegramMessageEmit } from './types';

export function registerTextHandler(
	bot: Bot,
	allowFrom: ReadonlySet<string>,
	emit: TelegramMessageEmit
): void {
	bot.on('message:text', async (ctx) => {
		const text = ctx.message.text;
		if (!text || text.startsWith('/')) return;

		const senderId = String(ctx.from?.id ?? '');
		if (allowFrom.size > 0 && !allowFrom.has(senderId)) {
			console.warn(`[telegram] Ignored message from unauthorized user ${senderId}`);
			return;
		}

		emit({ from: senderId, chatId: String(ctx.chat.id), text });
	});
}
