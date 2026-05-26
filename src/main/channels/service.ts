import Store from 'electron-store';
import {
	CHANNEL_DEFAULT_DM_POLICY,
	CHANNEL_DM_POLICIES,
	CHANNEL_PROVIDER_IDS,
	type Channel,
	type ChannelAccountProperties,
	type ChannelHeartbeatVisibilityConfig,
	type ChannelType,
	type GenericChannelProperties,
	type TelegramChannelProperties,
} from '../../shared/channels';

export interface ChannelsLogger {
	debug(source: string, message: string, data?: unknown): void;
	info(source: string, message: string, data?: unknown): void;
	warn(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}

type ChannelStoreSchema = Partial<Channel>;

const CHANNELS_LOG_SOURCE = 'ChannelsService';
const CHANNEL_STORE_NAME = 'channels';

const CHANNEL_ACCOUNT_STRING_KEYS = [
	'label',
	'token',
	'secret',
	'serverUrl',
	'webhookUrl',
	'appId',
	'clientId',
	'clientSecret',
	'username',
	'phoneNumber',
	'botUserId',
	'defaultTarget',
] as const;

const CHANNEL_ACCOUNT_LIST_KEYS = ['allowFrom', 'groupAllowFrom'] as const;

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

function normalizeHeartbeatVisibility(
	input: unknown
): ChannelHeartbeatVisibilityConfig | undefined {
	const source = readRecord(input);
	if (!source) return undefined;
	return {
		showOk: typeof source.showOk === 'boolean' ? source.showOk : undefined,
		showAlerts: typeof source.showAlerts === 'boolean' ? source.showAlerts : undefined,
		useIndicator: typeof source.useIndicator === 'boolean' ? source.useIndicator : undefined,
	};
}

function normalizeAccounts(input: unknown): Record<string, ChannelAccountProperties> | undefined {
	const source = readRecord(input);
	if (!source) return undefined;
	const accounts: Record<string, ChannelAccountProperties> = {};
	for (const [accountId, account] of Object.entries(source)) {
		const accountObject = readRecord(account);
		if (!accountObject) continue;
		const normalizedId = accountId.trim();
		if (!normalizedId) continue;
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
			dmPolicy: CHANNEL_DM_POLICIES.includes(accountObject.dmPolicy as never)
				? (accountObject.dmPolicy as ChannelAccountProperties['dmPolicy'])
				: CHANNEL_DEFAULT_DM_POLICY,
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
		dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
	};
}

function createDefaultChannelConfig<TKey extends ChannelType>(channelId: TKey): Channel[TKey] {
	if (channelId === 'telegram') {
		return {
			token: '',
			allowFrom: [],
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
			groupAllowFrom: [],
		} as unknown as Channel[TKey];
	}
	if (channelId === 'whatsapp') {
		return {
			phoneNumber: '',
			token: '',
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
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
			dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
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
	const storedObject = readRecord(stored);
	if (!storedObject) return defaults;

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

function validateStringList(value: unknown, key: string): string | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		return `${key} must be an array of strings`;
	}
	return undefined;
}

function validateHeartbeat(value: unknown, key: string): string | undefined {
	if (value === undefined) return undefined;
	const heartbeat = readRecord(value);
	if (!heartbeat) return `${key} must be an object`;
	for (const field of ['showOk', 'showAlerts', 'useIndicator']) {
		if (heartbeat[field] !== undefined && typeof heartbeat[field] !== 'boolean') {
			return `${key}.${field} must be a boolean`;
		}
	}
	return undefined;
}

function validateAccountProperties(value: unknown, key: string): string | undefined {
	const account = readRecord(value);
	if (!account) return `${key} must be an object`;
	if (account.enabled !== undefined && typeof account.enabled !== 'boolean') {
		return `${key}.enabled must be a boolean`;
	}
	for (const field of CHANNEL_ACCOUNT_STRING_KEYS) {
		if (account[field] !== undefined && typeof account[field] !== 'string') {
			return `${key}.${field} must be a string`;
		}
	}
	for (const field of CHANNEL_ACCOUNT_LIST_KEYS) {
		const error = validateStringList(account[field], `${key}.${field}`);
		if (error) return error;
	}
	if (account.dmPolicy !== undefined && !CHANNEL_DM_POLICIES.includes(account.dmPolicy as never)) {
		return `${key}.dmPolicy must be one of ${CHANNEL_DM_POLICIES.join(', ')}`;
	}
	return validateHeartbeat(account.heartbeat, `${key}.heartbeat`);
}

function validateAccounts(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	const accounts = readRecord(value);
	if (!accounts) return 'accounts must be an object';
	for (const [accountId, account] of Object.entries(accounts)) {
		if (!accountId.trim()) return 'account id is required';
		const error = validateAccountProperties(account, `accounts.${accountId}`);
		if (error) return error;
	}
	return undefined;
}

function validateChannelConfig(value: unknown): string | undefined {
	const config = readRecord(value);
	if (!config) return 'channel config must be an object';
	if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
		return 'enabled must be a boolean';
	}
	if (config.defaultAccountId !== undefined && typeof config.defaultAccountId !== 'string') {
		return 'defaultAccountId must be a string';
	}
	if (config.defaultTarget !== undefined && typeof config.defaultTarget !== 'string') {
		return 'defaultTarget must be a string';
	}
	if (config.dmPolicy !== undefined && !CHANNEL_DM_POLICIES.includes(config.dmPolicy as never)) {
		return `dmPolicy must be one of ${CHANNEL_DM_POLICIES.join(', ')}`;
	}
	for (const field of ['token', 'phoneNumber']) {
		if (config[field] !== undefined && typeof config[field] !== 'string') {
			return `${field} must be a string`;
		}
	}
	for (const field of CHANNEL_ACCOUNT_LIST_KEYS) {
		const error = validateStringList(config[field], field);
		if (error) return error;
	}
	return (
		validateHeartbeat(config.heartbeat, 'heartbeat') ??
		validateAccounts(config.accounts)
	);
}

export class ChannelsService {
	private readonly store: Store<ChannelStoreSchema>;

	constructor(private readonly logger?: ChannelsLogger) {
		this.store = new Store<ChannelStoreSchema>({
			name: CHANNEL_STORE_NAME,
			accessPropertiesByDotNotation: false,
		});
	}

	getChannel(): Channel {
		const next = createDefaultChannelState();
		const defaults = this.readDefaults();
		if (defaults) setChannelDefaults(next, defaults);
		for (const channelId of CHANNEL_PROVIDER_IDS) {
			const raw = this.readChannelConfig(channelId);
			setChannelConfigValue(next, channelId, mergeChannelConfig(channelId, raw));
		}
		this.logDebug('Read channel settings');
		return next;
	}

	getTelegramChannel(): TelegramChannelProperties {
		return this.getChannelConfig('telegram');
	}

	getChannelConfig<TKey extends ChannelType>(type: TKey): Channel[TKey] {
		const config = mergeChannelConfig(type, this.readChannelConfig(type));
		this.logDebug('Read channel config', { type });
		return config;
	}

	listConfiguredChannels(): ChannelType[] {
		const configured = CHANNEL_PROVIDER_IDS.filter((channelId) =>
			readRecord(this.readChannelConfig(channelId))
		);
		this.logDebug('Listed configured channels', { count: configured.length });
		return configured;
	}

	setChannelProperties<TKey extends ChannelType>(
		type: TKey,
		properties: Partial<Channel[TKey]>
	): Channel {
		const current = readRecord(this.readChannelConfig(type)) ?? {};
		const next = this.normalizeForWrite(type, {
			...current,
			...properties,
		});
		this.writeChannelConfig(type, next);
		return this.getChannel();
	}

	setChannelConfig<TKey extends ChannelType>(type: TKey, config: Channel[TKey]): Channel[TKey] {
		const next = this.normalizeForWrite(type, config);
		this.writeChannelConfig(type, next);
		return this.getChannelConfig(type);
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
			heartbeat: config.heartbeat,
		}).telegram;
	}

	deleteChannelConfig<TKey extends ChannelType>(type: TKey): Channel[TKey] {
		try {
			this.store.delete(type);
			this.logDebug('Deleted channel config', { type });
		} catch (error) {
			this.logError('Failed to delete channel config', { type, error: this.errorMessage(error) });
			throw error;
		}
		return this.getChannelConfig(type);
	}

	private normalizeForWrite<TKey extends ChannelType>(type: TKey, config: unknown): Channel[TKey] {
		const validationError = validateChannelConfig(config);
		if (validationError) {
			this.logWarn('Invalid channel config', { type, error: validationError });
			throw new Error(validationError);
		}
		const normalized = mergeChannelConfig(type, config);
		const compact = removeUndefinedProperties(normalized);
		if (JSON.stringify(config) !== JSON.stringify(compact)) {
			this.logDebug('Normalized channel config', { type });
		}
		return compact;
	}

	private readDefaults(): Channel['defaults'] | undefined {
		const raw = this.readStoreValue('defaults');
		if (raw === undefined) return undefined;
		const defaults = readRecord(raw);
		if (!defaults) {
			this.logWarn('Invalid stored channel defaults');
			return undefined;
		}
		const heartbeatError = validateHeartbeat(defaults.heartbeat, 'defaults.heartbeat');
		if (heartbeatError) {
			this.logWarn('Invalid stored channel defaults', { error: heartbeatError });
			return undefined;
		}
		return removeUndefinedProperties({
			heartbeat: normalizeHeartbeatVisibility(defaults.heartbeat),
		});
	}

	private readChannelConfig(type: ChannelType): unknown {
		const raw = this.readStoreValue(type);
		if (raw !== undefined && !readRecord(raw)) {
			this.logWarn('Invalid stored channel config', { type });
		}
		return raw;
	}

	private writeChannelConfig<TKey extends ChannelType>(type: TKey, config: Channel[TKey]): void {
		try {
			this.store.set(type, config);
			this.logDebug('Wrote channel config', { type });
		} catch (error) {
			this.logError('Failed to write channel config', { type, error: this.errorMessage(error) });
			throw error;
		}
	}

	private readStoreValue<TKey extends keyof ChannelStoreSchema>(
		key: TKey
	): ChannelStoreSchema[TKey] {
		try {
			const value = this.store.get(key);
			this.logDebug('Read channel store property', { key });
			return value;
		} catch (error) {
			this.logError('Failed to read channel store property', {
				key,
				error: this.errorMessage(error),
			});
			throw error;
		}
	}

	private logDebug(message: string, data?: unknown): void {
		this.logger?.debug(CHANNELS_LOG_SOURCE, message, data);
	}

	private logWarn(message: string, data?: unknown): void {
		this.logger?.warn(CHANNELS_LOG_SOURCE, message, data);
	}

	private logError(message: string, data?: unknown): void {
		this.logger?.error(CHANNELS_LOG_SOURCE, message, data);
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
