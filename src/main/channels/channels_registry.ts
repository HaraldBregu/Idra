import type { ChannelStatusEvent, ChannelType, StoredBotProvider } from '../../shared';
import { AppChannels } from '../../shared/ipc_channels_definitions';
import type { EventBus } from '../event_bus';
import type { LoggerService } from '../shared';
import type { Agent } from '../agent/agent';
import type { SttAudioInput } from '../../shared/stt_transcription';
import type { SpeechSynthesisResult } from '../../shared/speech_types';
import { getChannelProvider } from './channels_store';
import { canReceive } from './channels_security';
import { loadChannelVoice } from './channels_voice';
import type {
	ChannelAdapter,
	ChannelInboundMessage,
	ChannelMessageReceipt,
	ChannelOutboundMessage,
	ChannelStatusUpdate,
} from './channels_types';

// Fixed UUID so every channel message reuses the same agent session.
const CHANNEL_SESSION_ID = '7c1f41d3-9b2a-4e8f-b5c6-2d0a8e4f6a91';
const CHANNEL_START_REPLY = "Hi! I'm connected. Send me a message and I'll reply.";

export interface ChannelRegistryDependencies {
	logger: LoggerService;
	eventBus: EventBus;
	agentService?: Agent;
	transcribeVoice?: (audio: SttAudioInput) => Promise<string>;
	synthesizeVoice?: (text: string) => Promise<SpeechSynthesisResult>;
}

export interface ChannelRegistry {
	start(channel: ChannelType): Promise<void>;
	stop(channel: ChannelType): Promise<void>;
	restart(channel: ChannelType): Promise<void>;
	send(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
	getStatus(channel?: ChannelType): ChannelStatusEvent | undefined;
	destroy(): void;
}

export function createChannelRegistry(dependencies: ChannelRegistryDependencies): ChannelRegistry {
	const { logger, eventBus, agentService } = dependencies;
	const transcribeVoice =
		dependencies.transcribeVoice ??
		(async (audio: SttAudioInput) => {
			const { toText } = await import('../models/transcribe');
			return toText({ audio });
		});
	const synthesizeVoice =
		dependencies.synthesizeVoice ??
		(async (text: string) => {
			const { synthesize } = await import('../models/voice');
			return synthesize({ text });
		});
	const adapters = new Map<ChannelType, ChannelAdapter>();
	const statusCache = new Map<ChannelType, ChannelStatusEvent>();

	function botCredential(channel: ChannelType): StoredBotProvider | undefined {
		return getChannelProvider(channel);
	}

	async function createAdapter(
		channel: ChannelType,
		credential: StoredBotProvider
	): Promise<ChannelAdapter> {
		if (channel === 'telegram') {
			const { createTelegramAdapter } = await import('./adapters/telegram');
			return createTelegramAdapter({ token: credential.apiKey });
		}
		if (channel === 'discord') {
			const { createDiscordAdapter } = await import('./adapters/discord');
			return createDiscordAdapter({ token: credential.apiKey });
		}
		const { createSignalAdapter } = await import('./adapters/signal');
		return createSignalAdapter({
			accountId: credential.apiKey,
			baseUrl: credential.baseUrl,
		});
	}

	function handleStatus(channel: ChannelType, update: ChannelStatusUpdate): void {
		const event: ChannelStatusEvent = {
			type: channel,
			status: update.status,
			pairingCode: update.pairingCode,
			error: update.error,
			timestamp: Date.now(),
		};
		statusCache.set(channel, event);
		eventBus.emit('channel:status', event);
		eventBus.broadcast(AppChannels.channelsStatusChanged, event);
	}

	async function handleMessage(message: ChannelInboundMessage): Promise<void> {
		const decision = canReceive(message, botCredential(message.channel));
		if (!decision.allowed) {
			logger.info('ChannelRegistry', 'Dropped channel message', {
				channel: message.channel,
				chatType: message.chatType,
				reason: decision.reason,
			});
			return;
		}
		const reply = (content: ChannelOutboundMessage['content']) =>
			send({
				channel: message.channel,
				accountId: message.accountId,
				to: message.chatId,
				threadId: message.threadId,
				replyToMessageId: message.messageId,
				chatType: message.chatType,
				content,
				idempotencyKey: `${message.idempotencyKey}:reply`,
			});

		try {
			const text =
				message.content.type === 'text'
					? message.content.text
					: await transcribeVoice(await loadChannelVoice(message.content.voice));
			if (text.startsWith('/')) {
				const command = text.split(/\s+/)[0].slice(1).split('@')[0].toLowerCase();
				if (command === 'start') {
					await reply({ type: 'text', text: CHANNEL_START_REPLY });
				}
				return;
			}
			if (!agentService) return;

			eventBus.emit('channel:route', {
				channel: message.channel,
				accountId: message.accountId,
				to: message.chatId,
				threadId: message.threadId,
				replyToMessageId: message.messageId,
				chatType: message.chatType,
			});
			const response = await agentService.send(text, 'channels', {
				category: 'bot',
				interactive: false,
				sessionId: CHANNEL_SESSION_ID,
			});
			if (message.content.type === 'voice') {
				try {
					const voice = await synthesizeVoice(response);
					await reply({
						type: 'voice',
						voice: {
							data: voice.audio,
							mimeType: voice.mimeType,
							fileName: voiceFileName(voice.mimeType),
						},
						fallbackText: response,
					});
				} catch (error) {
					logger.warn('ChannelRegistry', 'Voice reply failed; sending text', {
						channel: message.channel,
						error: error instanceof Error ? error.message : String(error),
					});
					await reply({ type: 'text', text: response });
				}
			} else {
				await reply({ type: 'text', text: response });
			}
			logger.info('ChannelRegistry', 'Replied to channel message', {
				channel: message.channel,
				chatType: message.chatType,
			});
		} catch (error) {
			logger.error('ChannelRegistry', 'Channel agent reply failed', error);
		}
	}

	async function start(channel: ChannelType): Promise<void> {
		if (adapters.has(channel)) return;

		const credential = botCredential(channel);
		if (!credential?.apiKey.trim()) {
			logger.warn('ChannelRegistry', `${channel} channel is not configured`);
			return;
		}

		const adapter = await createAdapter(channel, credential);
		adapter.onStatus((update) => handleStatus(channel, update));
		adapter.onMessage((message) => {
			void handleMessage(message);
		});

		await adapter.start();
		adapters.set(channel, adapter);
		logger.info('ChannelRegistry', `Started ${channel} channel`);
	}

	async function stop(channel: ChannelType): Promise<void> {
		const adapter = adapters.get(channel);
		if (!adapter) return;
		try {
			await adapter.stop();
		} finally {
			adapters.delete(channel);
		}
	}

	async function send(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt> {
		const adapter = adapters.get(message.channel);
		if (!adapter) {
			throw new Error(`${message.channel} channel is not running`);
		}
		return adapter.send(message);
	}

	return {
		start,
		stop,
		async restart(channel) {
			await stop(channel);
			await start(channel);
		},
		send,
		getStatus(channel = 'telegram') {
			return statusCache.get(channel);
		},
		destroy() {
			for (const channel of adapters.keys()) {
				void stop(channel);
			}
		},
	};
}

function voiceFileName(mimeType: string): string {
	if (mimeType.includes('ogg')) return 'reply.ogg';
	if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'reply.m4a';
	if (mimeType.includes('wav')) return 'reply.wav';
	return 'reply.mp3';
}
