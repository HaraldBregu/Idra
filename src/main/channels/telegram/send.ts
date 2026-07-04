import type { Bot } from 'grammy';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from './constants';
import { sendDurableMessageBatch } from '../batch';
import type { ChannelMessageReceipt, ChannelOutboundMessage } from '../types';

export async function sendTelegramMessage(
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
