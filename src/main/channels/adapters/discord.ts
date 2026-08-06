import { Client, Events, GatewayIntentBits, Partials, type Message } from 'discord.js';
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

export interface DiscordAdapterOptions {
	token: string;
	accountId?: string;
}

const DISCORD_MAX_MESSAGE_LENGTH = 2000;

export function createDiscordAdapter(options: DiscordAdapterOptions): ChannelAdapter {
	const token = options.token.trim();
	if (!token) throw new Error('Discord bot token is required');
	const accountId = options.accountId?.trim() || 'default';

	const messageHandlers = new Set<ChannelInboundHandler>();
	const statusHandlers = new Set<ChannelStatusHandler>();

	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.MessageContent,
		],
		partials: [Partials.Channel],
	});

	function emitStatus(update: ChannelStatusUpdate): void {
		for (const handler of statusHandlers) handler(update);
	}

	registerMessageHandler(client, accountId, (message) => {
		for (const handler of messageHandlers) handler(message);
	});
	client.on(Events.ClientReady, () => emitStatus({ status: 'connected' }));
	client.on(Events.ShardDisconnect, () => emitStatus({ status: 'disconnected' }));
	client.on(Events.Error, (error) => {
		console.error('[discord] client error:', error.message);
		emitStatus({ status: 'error', error: error.message });
	});

	return {
		// ponytail: no manual health check or reconnect; discord.js reconnects on its own.
		async start() {
			emitStatus({ status: 'connecting' });
			await client.login(token);
		},
		async stop() {
			try {
				await client.destroy();
			} catch (error) {
				console.error('[discord] stop failed:', error);
			}
			emitStatus({ status: 'disconnected' });
		},
		send(message) {
			return sendMessage(client, {
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

function registerMessageHandler(
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

async function sendMessage(
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
