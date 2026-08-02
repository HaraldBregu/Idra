import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import {
	CHANNEL_DEFAULT_DM_POLICY,
	CHANNEL_DM_POLICIES,
	type Channel,
	type ChannelAccountProperties,
	type ChannelDmPolicy,
	type ChannelHeartbeatVisibilityConfig,
	type ChannelType,
} from '../../../shared';

export type ChannelsStoreState = Partial<Channel>;

const CHANNELS_STORE_NAME = 'settings.channels';

const ACCOUNT_STRING_KEYS = [
	'label',
	'token',
	'secret',
	'appId',
	'clientId',
	'clientSecret',
	'botUserId',
	'defaultTarget',
] as const;

const ACCOUNT_LIST_KEYS = ['allowFrom', 'groupAllowFrom'] as const;

function defaultChannelConfig(): Channel[ChannelType] {
	return {
		token: '',
		allowFrom: [],
		enabled: false,
		defaultAccountId: 'default',
		dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
		groupAllowFrom: [],
	};
}

const DEFAULT_CHANNELS_STORE: ChannelsStoreState = {
	providerId: '',
	modelId: '',
	telegram: defaultChannelConfig(),
	discord: defaultChannelConfig(),
};

const store = new Store<ChannelsStoreState>({
	name: CHANNELS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'channels'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CHANNELS_STORE,
});

export function getChannelsStore(): ChannelsStoreState {
	return store.store;
}

export function getChannels(): Channel {
	return {
		defaults: readDefaults(),
		providerId: getProviderId(),
		modelId: getModelId(),
		telegram: getChannelConfig('telegram'),
		discord: getChannelConfig('discord'),
	};
}

export function getProviderId(): string {
	const providerId = store.get('providerId');
	return typeof providerId === 'string' ? providerId.trim() : '';
}

export function setProviderId(providerId: string): void {
	store.set('providerId', providerId.trim());
}

export function getModelId(): string {
	const modelId = store.get('modelId');
	return typeof modelId === 'string' ? modelId.trim() : '';
}

export function setModelId(modelId: string): void {
	store.set('modelId', modelId.trim());
}

export function getChannelConfig<TKey extends ChannelType>(channel: TKey): Channel[TKey] {
	return mergeChannelConfig(store.get(channel));
}

export function setChannelConfig<TKey extends ChannelType>(
	channel: TKey,
	config: Channel[TKey]
): Channel[TKey] {
	const error = validateChannelConfig(config);
	if (error) throw new Error(error);
	store.set(channel, mergeChannelConfig(config));
	return getChannelConfig(channel);
}

export function setChannelProperties<TKey extends ChannelType>(
	channel: TKey,
	properties: Partial<Channel[TKey]>
): Channel[TKey] {
	const current = readRecord(store.get(channel)) ?? {};
	return setChannelConfig(channel, { ...current, ...properties } as Channel[TKey]);
}

export function deleteChannelConfig<TKey extends ChannelType>(channel: TKey): Channel[TKey] {
	store.set(channel, defaultChannelConfig());
	return getChannelConfig(channel);
}

function readDefaults(): Channel['defaults'] {
	const defaults = readRecord(store.get('defaults'));
	if (!defaults) return undefined;
	return { heartbeat: normalizeHeartbeat(defaults.heartbeat) };
}

function mergeChannelConfig(stored: unknown): Channel[ChannelType] {
	const source = readRecord(stored) ?? {};
	return {
		token: typeof source.token === 'string' ? source.token : '',
		allowFrom: normalizeStringList(source.allowFrom),
		enabled: typeof source.enabled === 'boolean' ? source.enabled : false,
		isolatedSession: typeof source.isolatedSession === 'boolean' ? source.isolatedSession : undefined,
		defaultAccountId:
			typeof source.defaultAccountId === 'string' ? source.defaultAccountId : 'default',
		defaultTarget: typeof source.defaultTarget === 'string' ? source.defaultTarget : undefined,
		dmPolicy: normalizeDmPolicy(source.dmPolicy) ?? CHANNEL_DEFAULT_DM_POLICY,
		groupAllowFrom: normalizeStringList(source.groupAllowFrom),
		accounts: normalizeAccounts(source.accounts),
		heartbeat: normalizeHeartbeat(source.heartbeat),
	};
}

function normalizeAccounts(input: unknown): Record<string, ChannelAccountProperties> | undefined {
	const source = readRecord(input);
	if (!source) return undefined;
	const accounts: Record<string, ChannelAccountProperties> = {};
	for (const [accountId, account] of Object.entries(source)) {
		const record = readRecord(account);
		const id = accountId.trim();
		if (!record || !id) continue;
		const normalized: ChannelAccountProperties = {
			enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
			allowFrom: normalizeStringList(record.allowFrom),
			groupAllowFrom: normalizeStringList(record.groupAllowFrom),
			dmPolicy: normalizeDmPolicy(record.dmPolicy) ?? CHANNEL_DEFAULT_DM_POLICY,
			heartbeat: normalizeHeartbeat(record.heartbeat),
		};
		for (const key of ACCOUNT_STRING_KEYS) {
			if (typeof record[key] === 'string') normalized[key] = record[key];
		}
		accounts[id] = normalized;
	}
	return Object.keys(accounts).length > 0 ? accounts : undefined;
}

function normalizeHeartbeat(input: unknown): ChannelHeartbeatVisibilityConfig | undefined {
	const source = readRecord(input);
	if (!source) return undefined;
	return {
		showOk: typeof source.showOk === 'boolean' ? source.showOk : undefined,
		showAlerts: typeof source.showAlerts === 'boolean' ? source.showAlerts : undefined,
		useIndicator: typeof source.useIndicator === 'boolean' ? source.useIndicator : undefined,
	};
}

function normalizeDmPolicy(value: unknown): ChannelDmPolicy | undefined {
	return CHANNEL_DM_POLICIES.includes(value as ChannelDmPolicy)
		? (value as ChannelDmPolicy)
		: undefined;
}

function normalizeStringList(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	return [...new Set(input.map((value) => String(value).trim()).filter(Boolean))];
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function validateChannelConfig(value: unknown): string | undefined {
	const config = readRecord(value);
	if (!config) return 'channel config must be an object';
	if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
		return 'enabled must be a boolean';
	}
	if (config.isolatedSession !== undefined && typeof config.isolatedSession !== 'boolean') {
		return 'isolatedSession must be a boolean';
	}
	for (const field of ['token', 'defaultAccountId', 'defaultTarget']) {
		if (config[field] !== undefined && typeof config[field] !== 'string') {
			return `${field} must be a string`;
		}
	}
	if (config.dmPolicy !== undefined && !normalizeDmPolicy(config.dmPolicy)) {
		return `dmPolicy must be one of ${CHANNEL_DM_POLICIES.join(', ')}`;
	}
	for (const field of ACCOUNT_LIST_KEYS) {
		const error = validateStringList(config[field], field);
		if (error) return error;
	}
	return validateHeartbeat(config.heartbeat, 'heartbeat') ?? validateAccounts(config.accounts);
}

function validateAccounts(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	const accounts = readRecord(value);
	if (!accounts) return 'accounts must be an object';
	for (const [accountId, account] of Object.entries(accounts)) {
		if (!accountId.trim()) return 'account id is required';
		const record = readRecord(account);
		if (!record) return `accounts.${accountId} must be an object`;
		if (record.enabled !== undefined && typeof record.enabled !== 'boolean') {
			return `accounts.${accountId}.enabled must be a boolean`;
		}
		for (const field of ACCOUNT_STRING_KEYS) {
			if (record[field] !== undefined && typeof record[field] !== 'string') {
				return `accounts.${accountId}.${field} must be a string`;
			}
		}
		for (const field of ACCOUNT_LIST_KEYS) {
			const error = validateStringList(record[field], `accounts.${accountId}.${field}`);
			if (error) return error;
		}
		if (record.dmPolicy !== undefined && !normalizeDmPolicy(record.dmPolicy)) {
			return `accounts.${accountId}.dmPolicy must be one of ${CHANNEL_DM_POLICIES.join(', ')}`;
		}
		const heartbeatError = validateHeartbeat(record.heartbeat, `accounts.${accountId}.heartbeat`);
		if (heartbeatError) return heartbeatError;
	}
	return undefined;
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
