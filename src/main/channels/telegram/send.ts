import type { Bot } from 'grammy';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from './constants';
import { sendDurableMessageBatch } from '../message';
import type { ChannelDeliveryPart, ChannelMessageReceipt, ChannelOutboundMessage } from '../types';

export async function sendChunked(
	bot: Bot,
	chatId: string,
	text: string
): Promise<ChannelDeliveryPart[]> {
	let remaining = text;
	const parts: ChannelDeliveryPart[] = [];
	while (remaining.length > 0) {
		const chunk = remaining.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
		remaining = remaining.slice(TELEGRAM_MAX_MESSAGE_LENGTH);
		const sent = await bot.api.sendMessage(chatId, chunk);
		parts.push({
			kind: 'text',
			platformMessageId: getMessageId(sent),
			timestamp: Date.now(),
			raw: sent,
		});
	}
	return parts;
}

export async function sendTelegramDurable(
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
				kind: 'text',
				platformMessageId: getMessageId(sent),
				threadId: message.threadId,
				replyToId: message.replyToMessageId,
				replyToMessageId: message.replyToMessageId,
				timestamp: Date.now(),
				raw: sent,
			};
		},
		{ maxLength: TELEGRAM_MAX_MESSAGE_LENGTH }
	);
}

function getMessageId(message: unknown): string | undefined {
	if (!message || typeof message !== 'object' || !('message_id' in message)) return undefined;
	return String((message as { message_id: unknown }).message_id);
}
