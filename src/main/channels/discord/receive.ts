import { Events, type Client, type Message } from 'discord.js';
import type { ChannelChatType, ChannelInboundHandler, ChannelInboundMessage } from '../types';

export function registerDiscordMessageHandler(
	client: Client,
	accountId: string,
	emit: ChannelInboundHandler
): void {
	client.on(Events.MessageCreate, (incoming) => {
		if (incoming.author.bot) return;
		const text = incoming.content;
		if (!text) return;

		const chatId = incoming.channelId;
		const message: ChannelInboundMessage = {
			channel: 'discord',
			accountId,
			senderId: incoming.author.id,
			senderName: incoming.member?.displayName ?? incoming.author.username,
			chatId,
			chatType: getChatType(incoming),
			messageId: incoming.id,
			threadId: incoming.channel.isThread() ? chatId : undefined,
			text,
			idempotencyKey: ['discord', accountId, chatId, incoming.id].join(':'),
			receivedAt: incoming.createdTimestamp,
		};
		emit(message);
	});
}

function getChatType(message: Message): ChannelChatType {
	if (message.channel.isDMBased()) return 'dm';
	if (message.channel.isThread()) return 'thread';
	return 'channel';
}
