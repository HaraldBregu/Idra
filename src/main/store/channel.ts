import {
	CHANNEL_PROVIDER_IDS,
	type Channel,
	type ChannelAccountProperties,
	type ChannelType,
	type GenericChannelProperties,
	type TelegramChannelProperties,
} from '../../shared/channels';
import type { SettingsStoreAccessor } from '../../shared/store';

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function readOptionalString(input: unknown): string | undefined {
	return typeof input === 'string' ? input : undefined;
}

function normalizeStringList(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	return [...new Set(input.map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeHeartbeatVisibility(input: unknown) {
	if (!input || typeof input !== 'object') return undefined;
	const source = input as Record<string, unknown>;
	return {
		showOk: typeof source.showOk === 'boolean' ? source.showOk : undefined,
		showAlerts: typeof source.showAlerts === 'boolean' ? source.showAlerts : undefined,
		useIndicator: typeof source.useIndicator === 'boolean' ? source.useIndicator : undefined,
	};
}

function normalizeAccounts(input: unknown): Record<string, ChannelAccountProperties> | undefined {
	if (!input || typeof input !== 'object') return undefined;
	const accounts: Record<string, ChannelAccountProperties> = {};
	for (const [accountId, account] of Object.entries(input as Record<string, unknown>)) {
		if (!account || typeof account !== 'object') continue;
		const normalizedId = accountId.trim();
		if (!normalizedId) continue;
		const accountObject = account as Record<string, unknown>;
		accounts[normalizedId] = {
			label: readOptionalString(accountObject.label),
			enabled: typeof accountObject.enabled === 'boolean' ? accountObject.enabled : undefined,
			token: readOptionalString(accountObject.token),
			secret: readOptionalString(accountObject.secret),
			serverUrl: readOptionalString(accountObject.serverUrl),
			webhookUrl: readOptionalString(accountObject.webhookUrl),
			appId: readOptionalString(accountObject.appId),
			clientId: readOptionalString(accountObject.clientId),
			clientSecret: readOptionalString(accountObject.clientSecret),
			username: readOptionalString(accountObject.username),
			phoneNumber: readOptionalString(accountObject.phoneNumber),
			botUserId: readOptionalString(accountObject.botUserId),
			defaultTarget: readOptionalString(accountObject.defaultTarget),
			allowFrom: normalizeStringList(accountObject.allowFrom),
			groupAllowFrom: normalizeStringList(accountObject.groupAllowFrom),
			dmPolicy:
				accountObject.dmPolicy === 'pairing' ||
				accountObject.dmPolicy === 'open' ||
				accountObject.dmPolicy === 'deny'
					? accountObject.dmPolicy
					: 'allowlist',
			heartbeat: normalizeHeartbeatVisibility(accountObject.heartbeat),
		};
	}
	return Object.keys(accounts).length > 0 ? accounts : undefined;
}

function createDefaultAccountConfig(channelId: ChannelType): ChannelAccountProperties {
	return {
		label: `${channelId} default`,
		enabled: false,
		token: '',
		serverUrl: '',
		webhookUrl: '',
		defaultTarget: '',
		allowFrom: [],
		groupAllowFrom: [],
		dmPolicy: 'allowlist',
	};
}

function createDefaultChannelConfig<TKey extends ChannelType>(channelId: TKey): Channel[TKey] {
	if (channelId === 'telegram') {
		return {
			token: '',
			allowFrom: [],
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: 'allowlist',
			groupAllowFrom: [],
		} as unknown as Channel[TKey];
	}
	if (channelId === 'whatsapp') {
		return {
			phoneNumber: '',
			token: '',
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: 'allowlist',
			allowFrom: [],
			groupAllowFrom: [],
		} as unknown as Channel[TKey];
	}
	if (channelId === 'discord') {
		return {
			token: '',
			allowFrom: [],
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: 'allowlist',
			groupAllowFrom: [],
		} as unknown as Channel[TKey];
	}

	const generic: GenericChannelProperties = {
		enabled: false,
		defaultAccountId: 'default',
		accounts: {
			default: createDefaultAccountConfig(channelId),
		},
	};
	return generic as Channel[TKey];
}

function mergeChannelConfig<TKey extends ChannelType>(
	channelId: TKey,
	stored: unknown
): Channel[TKey] {
	const defaults = createDefaultChannelConfig(channelId);
	if (!stored || typeof stored !== 'object') return defaults;
	const storedObject = stored as Record<string, unknown>;

	if (channelId === 'telegram') {
		return {
			...defaults,
			...storedObject,
			token: typeof storedObject.token === 'string' ? storedObject.token : '',
			allowFrom: normalizeStringList(storedObject.allowFrom),
			groupAllowFrom: normalizeStringList(storedObject.groupAllowFrom),
			accounts: normalizeAccounts(storedObject.accounts),
		} as Channel[TKey];
	}
	if (channelId === 'whatsapp') {
		return {
			...defaults,
			...storedObject,
			phoneNumber: typeof storedObject.phoneNumber === 'string' ? storedObject.phoneNumber : '',
			token: typeof storedObject.token === 'string' ? storedObject.token : '',
			allowFrom: normalizeStringList(storedObject.allowFrom),
			groupAllowFrom: normalizeStringList(storedObject.groupAllowFrom),
			accounts: normalizeAccounts(storedObject.accounts),
		} as Channel[TKey];
	}
	if (channelId === 'discord') {
		return {
			...defaults,
			...storedObject,
			token: typeof storedObject.token === 'string' ? storedObject.token : '',
			allowFrom: normalizeStringList(storedObject.allowFrom),
			groupAllowFrom: normalizeStringList(storedObject.groupAllowFrom),
			accounts: normalizeAccounts(storedObject.accounts),
		} as Channel[TKey];
	}

	return {
		...defaults,
		...storedObject,
		accounts:
			normalizeAccounts(storedObject.accounts) ?? (defaults as GenericChannelProperties).accounts,
	} as Channel[TKey];
}

function getStoredChannelConfig(
	channel: Partial<Channel> | undefined,
	channelId: ChannelType
): unknown {
	if (!channel || typeof channel !== 'object') return undefined;
	return channel[channelId];
}

function setChannelConfigValue<TKey extends ChannelType>(
	state: Channel,
	channelId: TKey,
	config: Channel[TKey]
): void {
	state[channelId] = config;
}

function setChannelDefaults(state: Channel, defaults: Channel['defaults']): void {
	Object.defineProperty(state, 'defaults', {
		value: defaults,
		enumerable: false,
		writable: true,
		configurable: true,
	});
}

function createDefaultChannelState(): Channel {
	const state = {} as Channel;
	setChannelDefaults(state, {});
	for (const channelId of CHANNEL_PROVIDER_IDS) {
		setChannelConfigValue(state, channelId, createDefaultChannelConfig(channelId));
	}
	return state;
}

function removeUndefinedProperties<T>(value: T): T {
	if (Array.isArray(value)) return value.map(removeUndefinedProperties) as T;
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
			item === undefined ? [] : [[key, removeUndefinedProperties(item)]]
		)
	) as T;
}

function compactChannelRoot(channel: Partial<Channel>): Partial<Channel> {
	const next: Partial<Channel> = {};
	if (readRecord(channel.defaults)) next.defaults = removeUndefinedProperties(channel.defaults);
	for (const channelId of CHANNEL_PROVIDER_IDS) {
		const config = channel[channelId];
		if (readRecord(config)) {
			(next as Partial<Record<ChannelType, unknown>>)[channelId] =
				removeUndefinedProperties(config);
		}
	}
	return next;
}

function readStoredChannel(value: unknown): Partial<Channel> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return compactChannelRoot(value as Partial<Channel>);
}

export class ChannelStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getChannel(): Channel {
		const channel = this.getStoredChannelRoot();
		const next = createDefaultChannelState();
		if (channel?.defaults && typeof channel.defaults === 'object') {
			setChannelDefaults(next, channel.defaults);
		}
		for (const channelId of CHANNEL_PROVIDER_IDS) {
			setChannelConfigValue(
				next,
				channelId,
				mergeChannelConfig(channelId, getStoredChannelConfig(channel, channelId))
			);
		}
		return next;
	}

	getTelegramChannel(): TelegramChannelProperties {
		return this.getChannel().telegram;
	}

	getChannelConfig<TKey extends ChannelType>(type: TKey): Channel[TKey] {
		return this.getChannel()[type];
	}

	setChannelProperties<TKey extends ChannelType>(
		type: TKey,
		properties: Partial<Channel[TKey]>
	): Channel {
		const current = this.getStoredChannelRoot();
		const currentProperties = readRecord(current[type]) ?? {};
		const next = compactChannelRoot({
			...current,
			[type]: mergeChannelConfig(type, {
				...currentProperties,
				...properties,
			}),
		});
		this.store.set('channels', next);
		return this.getChannel();
	}

	setChannelConfig<TKey extends ChannelType>(type: TKey, config: Channel[TKey]): Channel[TKey] {
		const current = this.getStoredChannelRoot();
		const next = compactChannelRoot({
			...current,
			[type]: mergeChannelConfig(type, config) as Channel[TKey],
		});
		this.store.set('channels', next);
		return this.getChannel()[type];
	}

	setTelegramChannel(config: TelegramChannelProperties): TelegramChannelProperties {
		return this.setChannelProperties('telegram', {
			token: config.token,
			allowFrom: config.allowFrom,
			enabled: config.enabled,
			defaultAccountId: config.defaultAccountId,
			defaultTarget: config.defaultTarget,
			dmPolicy: config.dmPolicy,
			groupAllowFrom: config.groupAllowFrom,
			accounts: config.accounts,
		}).telegram;
	}

	private getStoredChannelRoot(): Partial<Channel> {
		return readStoredChannel(this.store.get('channels') ?? (this.store as { get(key: string): unknown }).get('channel')) ?? {};
	}
}
