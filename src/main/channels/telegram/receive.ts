import type { Bot } from 'grammy';
import type { ChannelChatType, ChannelInboundHandler, ChannelInboundMessage } from '../types';

export function registerTelegramTextHandler(
	bot: Bot,
	accountId: string,
	emit: ChannelInboundHandler
): void {
	bot.on('message:text', (ctx) => {
		const text = ctx.message.text;
		if (!text || text.startsWith('/')) return;

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
