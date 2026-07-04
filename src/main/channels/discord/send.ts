import type { Client } from 'discord.js';
import { DISCORD_MAX_MESSAGE_LENGTH } from './constants';
import { sendDurableMessageBatch } from '../batch';
import type { ChannelMessageReceipt, ChannelOutboundMessage } from '../types';

export async function sendDiscordMessage(
	client: Client,
	message: ChannelOutboundMessage
): Promise<ChannelMessageReceipt> {
	const targetId = message.threadId ?? message.to;
	const channel = await client.channels.fetch(targetId);
	if (!channel?.isSendable()) {
		throw new Error(`Discord channel is not sendable: ${targetId}`);
	}

	let first = true;
	return sendDurableMessageBatch(
		message,
		async (text) => {
			const sent = await channel.send({
				content: text,
				reply:
					first && message.replyToMessageId
						? { messageReference: message.replyToMessageId }
						: undefined,
			});
			first = false;
			return {
				platformMessageId: sent.id,
				timestamp: Date.now(),
			};
		},
		{ maxLength: DISCORD_MAX_MESSAGE_LENGTH }
	);
}
