import type { Bot } from 'grammy';
import type { TelegramMessageEmit } from './types';
import type { ChannelChatType, ChannelNormalizedInboundMessage } from '../types';

export function registerTextHandler(
	bot: Bot,
	emit: TelegramMessageEmit
): void {
	bot.on('message:text', async (ctx) => {
		const text = ctx.message.text;
		if (!text || text.startsWith('/')) return;

		const senderId = String(ctx.from?.id ?? '');
		emit({
			from: senderId,
			fromName:
				[ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || ctx.from?.username,
			chatId: String(ctx.chat.id),
			text,
			messageId: ctx.message.message_id === undefined ? undefined : String(ctx.message.message_id),
			threadId: ctx.message.message_thread_id ? String(ctx.message.message_thread_id) : undefined,
			chatType: getTelegramChatType(ctx.chat.type, ctx.message.message_thread_id),
			provenance: {
				transport: 'polling',
				chatType: ctx.chat.type,
			},
		});
	});
}

export function normalizeTelegramTextMessage(input: {
	accountId: string;
	from: string;
	fromName?: string;
	chatId: string;
	text: string;
	messageId?: string;
	threadId?: string;
	chatType?: ChannelChatType;
	provenance?: Record<string, unknown>;
	receivedAt?: number;
}): ChannelNormalizedInboundMessage {
	const messageId = input.messageId ?? `${input.chatId}:${input.from}:${input.text}`;
	const threadId = input.threadId;

	return {
		channelId: 'telegram',
		accountId: input.accountId,
		senderId: input.from,
		senderName: input.fromName,
		targetId: input.chatId,
		chatType: input.chatType ?? 'dm',
		messageId,
		threadId,
		text: input.text,
		media: [],
		provenance: input.provenance ?? {},
		idempotencyKey: ['telegram', input.accountId, input.chatId, threadId, messageId]
			.filter(Boolean)
			.join(':'),
		receivedAt: input.receivedAt ?? Date.now(),
	};
}

function getTelegramChatType(type: string | undefined, threadId: unknown): ChannelChatType {
	if (threadId) return 'thread';
	if (type === 'group' || type === 'supergroup') return 'group';
	if (type === 'channel') return 'channel';
	return 'dm';
}
