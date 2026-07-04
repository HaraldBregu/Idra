import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { registerDiscordMessageHandler } from './receive';
import { sendDiscordMessage } from './send';
import type { DiscordAdapterOptions } from './types';
import type {
	ChannelAdapter,
	ChannelInboundHandler,
	ChannelStatusHandler,
	ChannelStatusUpdate,
} from '../types';

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

	registerDiscordMessageHandler(client, accountId, (message) => {
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
			return sendDiscordMessage(client, {
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
