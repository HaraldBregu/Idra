import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import type { Channel, ChannelStatusEvent, ChannelType } from '../../shared/types';
import { AppChannels } from '../../shared/channels';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import type { EventBus } from '../core/event-bus';
import type { AssistantService } from '../assistant';
import { TelegramAdapter } from './telegram';
import { WhatsAppAdapter } from './whatsapp';
import { DiscordAdapter } from './discord';
import { panel } from './panel';

marked.use(markedTerminal() as Parameters<typeof marked.use>[0]);
import type {
	ChannelAdapter,
	ChannelAdapterFactory,
	ChannelInboundMessage,
	ChannelOutboundMessage,
	ChannelStatusUpdate,
} from './types';

export class ChannelRegistry {
	private adapters = new Map<ChannelType, ChannelAdapter>();
	private factories: Record<ChannelType, ChannelAdapterFactory>;
	private statusCache = new Map<ChannelType, ChannelStatusEvent>();

	constructor(
		private store: StoreService,
		private logger: LoggerService,
		private eventBus: EventBus,
		private assistant: AssistantService
	) {
		this.factories = {
			telegram: (ch) =>
				new TelegramAdapter({
					token: ch.telegram.token,
					allowFrom: ch.telegram.allowFrom,
				}),
			whatsapp: (ch) =>
				new WhatsAppAdapter({
					auth_dir: path.join(
						app.getPath('userData'),
						'channels',
						'whatsapp',
						ch.whatsapp.phoneNumber || 'default'
					),
					phone_number: ch.whatsapp.phoneNumber,
				}),
			discord: (ch) =>
				new DiscordAdapter({
					token: ch.discord.token,
					allowFrom: ch.discord.allowFrom,
				}),
		};
	}

	async startAll(): Promise<void> {
		const channel = this.store.getChannel();
		if (!channel) return;
		for (const type of Object.keys(this.factories) as ChannelType[]) {
			if (type === 'whatsapp') continue;
			await this.start(type, channel);
		}
	}

	async start(type: ChannelType, channel: Channel): Promise<void> {
		if (this.adapters.has(type)) return;

		const factory = this.factories[type];
		if (!factory) {
			this.logger.warn('ChannelRegistry', `Unknown channel type: ${type}`);
			return;
		}

		try {
			const adapter = factory(channel);
			adapter.onMessage((msg) => {
				void this.handleMessage(msg);
			});
			adapter.onStatus((update) => this.handleStatus(type, update));
			await adapter.start();
			this.adapters.set(type, adapter);
			this.logger.info('ChannelRegistry', `Started ${type} channel`);
		} catch (err) {
			this.logger.error('ChannelRegistry', `Failed to start ${type} channel`, err);
			this.handleStatus(type, { status: 'error', error: String(err) });
		}
	}

	/**
	 * Persist the WhatsApp phone number, restart the adapter, and resolve with
	 * the pairing code emitted by Baileys. Rejects on adapter error, on the
	 * socket connecting before a code is available, or after a 30s timeout.
	 */
	async requestWhatsappPairingCode(phoneNumber: string): Promise<string> {
		const trimmed = phoneNumber.replace(/[^\d]/g, '');
		if (!trimmed) throw new Error('phoneNumber is required');

		const persisted = this.store.setWhatsappChannel({
			phoneNumber: trimmed,
			token: '',
		});

		const existing = this.adapters.get('whatsapp');
		if (existing) {
			try {
				await existing.stop();
			} catch (err) {
				this.logger.error('ChannelRegistry', 'Failed to stop whatsapp before pairing', err);
			}
			this.adapters.delete('whatsapp');
		}

		// Wipe the auth dir so requestPairingCode is always invoked (creds.registered
		// stays true locally even after server-side logout, which would otherwise
		// cause the adapter to skip the pairing block and hang).
		const authDir = path.join(
			app.getPath('userData'),
			'channels',
			'whatsapp',
			trimmed
		);
		await fs.rm(authDir, { recursive: true, force: true }).catch((err) => {
			this.logger.warn('ChannelRegistry', 'Failed to wipe whatsapp auth dir', err);
		});

		const factory = this.factories.whatsapp;
		const adapter = factory(persisted);
		adapter.onMessage((msg) => {
			void this.handleMessage(msg);
		});

		return new Promise<string>((resolve, reject) => {
			let settled = false;
			let timer: NodeJS.Timeout | null = null;
			const settle = (fn: () => void): void => {
				if (settled) return;
				settled = true;
				if (timer) clearTimeout(timer);
				fn();
			};

			adapter.onStatus((update) => {
				this.handleStatus('whatsapp', update);
				if (settled) return;
				if (update.status === 'pairing_code' && update.pairingCode) {
					settle(() => resolve(update.pairingCode as string));
				} else if (update.status === 'connected') {
					settle(() => reject(new Error('WhatsApp already paired — no code needed')));
				} else if (update.status === 'error' && update.error) {
					settle(() => reject(new Error(update.error)));
				}
			});

			adapter
				.start()
				.then(() => {
					this.adapters.set('whatsapp', adapter);
				})
				.catch((err) => {
					settle(() => reject(err instanceof Error ? err : new Error(String(err))));
				});

			timer = setTimeout(() => {
				settle(() => reject(new Error('Pairing code request timed out')));
			}, 30_000);
		});
	}

	async restart(type: ChannelType): Promise<void> {
		const existing = this.adapters.get(type);
		if (existing) {
			try {
				await existing.stop();
			} catch (err) {
				this.logger.error('ChannelRegistry', `Failed to stop ${type} during restart`, err);
			}
			this.adapters.delete(type);
		}
		const channel = this.store.getChannel();
		if (!channel) return;
		await this.start(type, channel);
	}

	getStatus(): Partial<Record<ChannelType, ChannelStatusEvent>> {
		const out: Partial<Record<ChannelType, ChannelStatusEvent>> = {};
		for (const [type, evt] of this.statusCache) out[type] = evt;
		return out;
	}

	async send(msg: ChannelOutboundMessage): Promise<void> {
		const adapter = this.adapters.get(msg.type);
		if (!adapter) {
			throw new Error(`No active adapter for channel type: ${msg.type}`);
		}
		await adapter.send(msg);
	}

	private handleStatus(type: ChannelType, update: ChannelStatusUpdate): void {
		const event: ChannelStatusEvent = {
			type,
			status: update.status,
			pairingCode: update.pairingCode,
			error: update.error,
			timestamp: Date.now(),
		};
		this.statusCache.set(type, event);
		this.eventBus.broadcast(AppChannels.channelStatusChanged, event);
	}

	private async handleMessage(msg: ChannelInboundMessage): Promise<void> {
		console.log('[ChannelRegistry] message received', msg);
		try {
			const reply = await this.assistant.send(msg.text);
			const rendered = (await marked.parse(reply)).toString().trimEnd();
			console.log(panel('assistant', rendered, 'green'));
			await this.send({ type: msg.type, to: msg.chatId, text: reply });
		} catch (err) {
			this.logger.error('ChannelRegistry', `Assistant failed for ${msg.type}`, err);
		}
	}

	async stopAll(): Promise<void> {
		for (const [type, adapter] of this.adapters) {
			try {
				await adapter.stop();
			} catch (err) {
				this.logger.error('ChannelRegistry', `Failed to stop ${type}`, err);
			}
		}
		this.adapters.clear();
	}

	get(type: ChannelType): ChannelAdapter | undefined {
		return this.adapters.get(type);
	}

	destroy(): void {
		void this.stopAll();
	}
}
