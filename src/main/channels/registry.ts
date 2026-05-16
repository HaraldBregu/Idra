import type { ChannelStatusEvent } from '../../shared/channels';
import { ChannelsChannels } from '../../shared/ipc-channels';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { AgentService } from '../service';
import type { TelegramAdapterOptions } from './telegram/types';
import { createBundledCatalogPlugins } from './catalog-plugins';
import { listChannelCatalog, normalizeChannelId } from './catalog';
import { telegramChannelPlugin } from './telegram/plugin';
import { runChannelTurn } from './turn';
import type {
	ChannelAdapter,
	ChannelInboundMessage,
	ChannelPlugin,
	ChannelOutboundMessage,
	ChannelStatusUpdate,
} from './types';
import type { ChannelType, TelegramChannelProperties } from '../../shared/channels';

export interface ChannelRegistryOptions {
	telegram?: TelegramAdapterOptions;
}

export type ChannelRuntimeFactory = (config: unknown) => Promise<ChannelAdapter> | ChannelAdapter;

export interface ChannelRegistryDependencies {
	logger: LoggerService;
	eventBus: EventBus;
	agentService?: AgentService;
	runtimeFactories?: Partial<Record<ChannelType, ChannelRuntimeFactory>>;
}

export class ChannelRegistry {
	private readonly plugins = new Map<ChannelType, ChannelPlugin>();
	private readonly adapters = new Map<ChannelType, ChannelAdapter>();
	private readonly channelConfigs = new Map<ChannelType, unknown>();
	private readonly runtimeFactories = new Map<ChannelType, ChannelRuntimeFactory>();
	private readonly statusCache = new Map<ChannelType, ChannelStatusEvent>();

	constructor(private readonly dependencies: ChannelRegistryDependencies) {
		for (const plugin of createBundledCatalogPlugins()) {
			this.registerPlugin(plugin);
		}
		this.registerPlugin(telegramChannelPlugin);
		this.registerRuntimeFactory('telegram', async (config) => {
			const { TelegramAdapter } = await import('./telegram');
			return new TelegramAdapter(config as TelegramAdapterOptions);
		});
		for (const [channelId, factory] of Object.entries(dependencies.runtimeFactories ?? {})) {
			if (factory) this.registerRuntimeFactory(channelId as ChannelType, factory);
		}
	}

	registerPlugin(plugin: ChannelPlugin): void {
		if (plugin.id !== plugin.id.toLowerCase()) {
			throw new Error(`Channel plugin id must be lowercase: ${plugin.id}`);
		}
		this.plugins.set(plugin.id, plugin);
	}

	listPlugins(): ChannelPlugin[] {
		return [...this.plugins.values()];
	}

	listCatalog() {
		return listChannelCatalog();
	}

	getPlugin(type: ChannelType | string): ChannelPlugin | undefined {
		const channelId = this.resolveChannelId(type);
		return channelId ? this.plugins.get(channelId) : undefined;
	}

	registerRuntimeFactory(type: ChannelType | string, factory: ChannelRuntimeFactory): void {
		const channelId = this.requireChannelId(type);
		this.runtimeFactories.set(channelId, factory);
	}

	configure(options: ChannelRegistryOptions): void {
		if (options.telegram) {
			this.configureChannel('telegram', this.getTelegramConfig(options.telegram));
		}
	}

	async startTelegram(options?: TelegramAdapterOptions): Promise<void> {
		await this.startChannel('telegram', options ? this.getTelegramConfig(options) : undefined);
	}

	async stopTelegram(): Promise<void> {
		await this.stopChannel('telegram');
	}

	async restartTelegram(options?: TelegramAdapterOptions): Promise<void> {
		await this.restartChannel('telegram', options ? this.getTelegramConfig(options) : undefined);
	}

	configureChannel(type: ChannelType | string, config: unknown): void {
		const channelId = this.requireChannelId(type);
		const plugin = this.plugins.get(channelId);
		if (!plugin) throw new Error(`Channel plugin is not registered: ${channelId}`);
		const errors = plugin.setup?.validate(config as never) ?? [];
		if (errors.length > 0) {
			throw new Error(errors.join(' '));
		}
		this.channelConfigs.set(channelId, config);
	}

	async startChannel(type: ChannelType | string, config?: unknown): Promise<void> {
		const channelId = this.requireChannelId(type);
		if (config) this.configureChannel(channelId, config);
		if (this.adapters.has(channelId)) return;

		const plugin = this.plugins.get(channelId);
		if (!plugin) throw new Error(`Channel plugin is not registered: ${channelId}`);

		const channelConfig = this.channelConfigs.get(channelId);
		if (!channelConfig) {
			this.dependencies.logger.warn('ChannelRegistry', `${plugin.meta.name} channel is not configured`);
			return;
		}

		const account = plugin.config.getDefaultAccount(channelConfig);
		if (account && !account.enabled) {
			this.dependencies.logger.warn('ChannelRegistry', `${plugin.meta.name} account is disabled`, {
				channelId,
				accountId: account.id,
				reason: account.disabledReason,
			});
			return;
		}
		if (account && !account.configured) {
			this.dependencies.logger.warn('ChannelRegistry', `${plugin.meta.name} account is not configured`, {
				channelId,
				accountId: account.id,
				reason: account.unconfiguredReason,
			});
			return;
		}

		const factory = this.runtimeFactories.get(channelId);
		if (!factory) {
			this.dependencies.logger.warn('ChannelRegistry', `${plugin.meta.name} channel has no runtime`);
			return;
		}

		const adapter = await factory(channelConfig);
		adapter.onStatus((update) => this.handleStatus(channelId, update));
		adapter.onMessage((message) => {
			void this.handleMessage(message);
		});

		await adapter.start();
		this.adapters.set(channelId, adapter);
		this.dependencies.logger.info('ChannelRegistry', `Started ${channelId} channel`);
	}

	async stopChannel(type: ChannelType | string): Promise<void> {
		const channelId = this.requireChannelId(type);
		const adapter = this.adapters.get(channelId);
		if (!adapter) return;
		try {
			await adapter.stop();
		} finally {
			this.adapters.delete(channelId);
		}
	}

	async restartChannel(type: ChannelType | string, config?: unknown): Promise<void> {
		await this.stopChannel(type);
		await this.startChannel(type, config);
	}

	async send(message: ChannelOutboundMessage): Promise<void> {
		const channelId = this.requireChannelId(message.type);
		const adapter = this.adapters.get(channelId);
		if (!adapter) {
			throw new Error(`${this.plugins.get(channelId)?.meta.name ?? channelId} channel is not running`);
		}
		await adapter.send({ ...message, type: channelId });
	}

	getStatus(type: ChannelType | string = 'telegram'): ChannelStatusEvent | undefined {
		const channelId = this.resolveChannelId(type);
		return channelId ? this.statusCache.get(channelId) : undefined;
	}

	destroy(): void {
		for (const channelId of this.adapters.keys()) {
			void this.stopChannel(channelId);
		}
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
		this.dependencies.eventBus.emit('channel:status', event);
		this.dependencies.eventBus.broadcast(ChannelsChannels.statusChanged, event);
	}

	private async handleMessage(message: ChannelInboundMessage): Promise<void> {
		const channelId = this.requireChannelId(message.type);
		const plugin = this.plugins.get(channelId);
		if (!plugin) {
			this.dependencies.logger.warn('ChannelRegistry', 'Message from unregistered channel', {
				type: channelId,
			});
			return;
		}

		const accountId = message.accountId ?? 'default';
		const config = this.getChannelConfig(channelId);
		try {
			const result = await runChannelTurn({
				message: { ...message, type: channelId },
				accountId,
				config,
				plugin,
				resolveAccount: (channelConfig, resolvedAccountId) =>
					plugin.config.resolveAccount(channelConfig, resolvedAccountId),
				record: (normalized) => {
					const sessionKey = plugin.threading?.getSessionKey(normalized);
					this.dependencies.logger.info('ChannelRegistry', 'Received channel message', {
						channelId,
						accountId: normalized.accountId,
						chatType: normalized.chatType,
						sessionKey,
					});
				},
				dispatch: async (normalized) => {
					if (!this.dependencies.agentService) return;
					const reply = await this.dependencies.agentService.send(normalized.text);
					const target = plugin.threading?.resolveReplyTarget(message) ?? { to: message.chatId };
					await this.send({
						type: channelId,
						accountId,
						to: target.to,
						threadId: target.threadId,
						replyToMessageId: target.replyToMessageId,
						text: reply,
						idempotencyKey: `${normalized.idempotencyKey}:reply`,
					});
				},
			});
			if (result.decision.outcome !== 'dispatch') {
				this.dependencies.logger.info('ChannelRegistry', 'Channel admission completed', {
					outcome: result.decision.outcome,
					...result.decision.diagnostics,
				});
			}
		} catch (error) {
			this.dependencies.logger.error('ChannelRegistry', 'Channel agent reply failed', error);
		}
	}

	private getTelegramConfig(options: TelegramAdapterOptions): TelegramChannelProperties {
		const config: TelegramChannelProperties = {
			token: options.token,
			allowFrom: [...options.allowFrom],
		};
		if (options.accountId) config.defaultAccountId = options.accountId;
		if (options.defaultTarget) config.defaultTarget = options.defaultTarget;
		return config;
	}

	private getChannelConfig(type: ChannelType): unknown {
		return this.channelConfigs.get(type) ?? {};
	}

	private resolveChannelId(type: ChannelType | string): ChannelType | null {
		return normalizeChannelId(type);
	}

	private requireChannelId(type: ChannelType | string): ChannelType {
		const channelId = this.resolveChannelId(type);
		if (!channelId) throw new Error(`Unsupported channel type: ${type}`);
		return channelId;
	}
}
