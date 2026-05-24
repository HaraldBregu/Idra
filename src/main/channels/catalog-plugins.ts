import { CHANNEL_CATALOG, type ChannelCatalogEntry } from './catalog';
import { createChatChannelPlugin, defineChannelPluginEntry } from './plugin';
import type {
	ChannelAccountSnapshot,
	ChannelChatType,
	ChannelConfigAdapter,
	ChannelConversationResolution,
	ChannelInboundMessage,
	ChannelMessagingAdapter,
	ChannelNormalizedInboundMessage,
	ChannelParsedTarget,
	ChannelPlugin,
} from './types';
import {
	CHANNEL_DEFAULT_ACCOUNT_ID,
	CHANNEL_DEFAULT_DM_POLICY,
	type ChannelAccountProperties,
	type ChannelType,
	type GenericChannelProperties,
} from '../../shared/channels';

type CatalogChannelConfig = GenericChannelProperties & ChannelAccountProperties;
type CatalogAccountStringField = Extract<
	keyof ChannelAccountProperties,
	| 'token'
	| 'secret'
	| 'serverUrl'
	| 'webhookUrl'
	| 'appId'
	| 'clientId'
	| 'clientSecret'
	| 'username'
	| 'phoneNumber'
	| 'botUserId'
>;

const CONFIGURATION_FIELDS: readonly CatalogAccountStringField[] = [
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
];

export function createCatalogOnlyChannelPlugin(
	entry: ChannelCatalogEntry
): ChannelPlugin<GenericChannelProperties> {
	return defineChannelPluginEntry({
		...createChatChannelPlugin<CatalogChannelConfig, never>({
			id: entry.id,
			meta: {
				name: entry.label,
				description: entry.blurb,
				version: '0.1.0',
			},
			capabilities: {
				inbound: false,
				outbound: false,
				text: false,
				media: false,
				voice: false,
				polls: false,
				receipts: false,
				threading: false,
				groups: false,
				setup: entry.setupVisible,
				longRunningGateway: false,
				durableDelivery: [],
			},
			config: createCatalogConfigAdapter(entry),
			messaging: createCatalogMessagingAdapter(entry),
			status: {
				defaultRuntime: {
					status: 'disconnected',
					reason: 'not_implemented',
				},
			},
			doctor: {
				inspect() {
					return [
						{
							severity: 'info',
							message: `${entry.label} is cataloged but does not have a bundled runtime yet.`,
						},
					];
				},
			},
		}),
	});
}

export function createBundledCatalogPlugins(): ChannelPlugin[] {
	return CHANNEL_CATALOG.map(createCatalogOnlyChannelPlugin);
}

function createCatalogConfigAdapter(
	entry: ChannelCatalogEntry
): ChannelConfigAdapter<CatalogChannelConfig> {
	const adapter: ChannelConfigAdapter<CatalogChannelConfig> = {
		listAccounts(config) {
			const ids = listCatalogAccountIds(config);
			return ids.map((id) => toAccount(entry, id, config));
		},
		listAccountIds(config) {
			return listCatalogAccountIds(config);
		},
		resolveAccount(config, accountId = defaultCatalogAccountId(config)) {
			const normalizedAccountId = accountId.trim() || defaultCatalogAccountId(config);
			if (!listCatalogAccountIds(config).includes(normalizedAccountId)) return null;
			return toAccount(entry, normalizedAccountId, config);
		},
		inspectAccount(config, accountId) {
			return adapter.resolveAccount(config, accountId);
		},
		describeAccount(config, accountId) {
			return adapter.resolveAccount(config, accountId);
		},
		getDefaultAccount(config) {
			return adapter.resolveAccount(config, defaultCatalogAccountId(config));
		},
		defaultAccountId(config) {
			return defaultCatalogAccountId(config);
		},
		isEnabled(config, accountId) {
			return adapter.resolveAccount(config, accountId)?.enabled ?? false;
		},
		isConfigured(config, accountId) {
			return adapter.resolveAccount(config, accountId)?.configured ?? false;
		},
		disabledReason(config, accountId) {
			return adapter.resolveAccount(config, accountId)?.disabledReason ?? null;
		},
		unconfiguredReason(config, accountId) {
			return adapter.resolveAccount(config, accountId)?.unconfiguredReason ?? null;
		},
		getAllowlist(config, accountId) {
			return adapter.resolveAllowFrom(config, accountId);
		},
		resolveAllowFrom(config, accountId) {
			return adapter.resolveAccount(config, accountId)?.allowFrom ?? [];
		},
		formatAllowFrom(config, accountId) {
			const allowFrom = adapter.resolveAllowFrom(config, accountId);
			return allowFrom.length > 0 ? allowFrom.join(', ') : 'none';
		},
		getDefaultTarget(config, accountId) {
			return adapter.resolveDefaultTo(config, accountId);
		},
		resolveDefaultTo(config, accountId) {
			return adapter.resolveAccount(config, accountId)?.defaultTargetId ?? null;
		},
	};
	return adapter;
}

function createCatalogMessagingAdapter(entry: ChannelCatalogEntry): ChannelMessagingAdapter {
	const targetPrefixes = [entry.id, ...entry.aliases] as readonly string[];
	const adapter: ChannelMessagingAdapter = {
		targetPrefixes,
		normalizeTarget(target) {
			const parsed = adapter.parseExplicitTarget(target);
			if (parsed) return parsed.targetId;
			const trimmed = target.trim();
			return trimmed ? trimmed : null;
		},
		parseExplicitTarget(target) {
			return parseExplicitTarget(entry.id, targetPrefixes, target);
		},
		inferTargetChatType(target) {
			return inferTargetChatType(target);
		},
		resolveInboundConversation(message) {
			return resolveCatalogConversation({
				channelId: entry.id,
				accountId: message.accountId,
				targetId: message.targetId,
				threadId: message.threadId,
				chatType: message.chatType,
				raw: message.targetId,
			});
		},
		resolveSessionConversation(target) {
			return resolveCatalogConversation(target);
		},
		resolveDeliveryTarget(target) {
			return target.targetId;
		},
		resolveSessionTarget(target) {
			return resolveCatalogConversation(target).sessionTarget;
		},
		resolveOutboundSessionRoute(message) {
			return (
				adapter.parseExplicitTarget(message.to) ?? {
					channelId: entry.id,
					accountId: message.accountId,
					targetId: message.to,
					threadId: message.threadId,
					chatType: message.threadId ? 'thread' : inferTargetChatType(message.to),
					raw: message.to,
				}
			);
		},
		targetResolver(input) {
			return adapter.parseExplicitTarget(input);
		},
		formatTargetDisplay(target) {
			const account = target.accountId ? `${target.accountId}/` : '';
			const thread = target.threadId ? `#${target.threadId}` : '';
			return `${entry.id}:${account}${target.targetId}${thread}`;
		},
		normalizeInbound(message, accountId) {
			if (message.type !== entry.id) return null;
			return normalizeCatalogInbound(entry.id, message, accountId);
		},
	};
	return adapter;
}

function toAccount(
	entry: ChannelCatalogEntry,
	id: string,
	config: CatalogChannelConfig
): ChannelAccountSnapshot {
	const account = resolveAccountConfig(config, id);
	const enabled = config.enabled !== false && account?.enabled !== false;
	const configured = isConfiguredAccount(account);
	return {
		id,
		label: account?.label?.trim() || (id === CHANNEL_DEFAULT_ACCOUNT_ID ? entry.label : id),
		enabled,
		configured,
		defaultTargetId: account?.defaultTarget,
		allowFrom: normalizeList(account?.allowFrom ?? []),
		groupAllowFrom: normalizeList(account?.groupAllowFrom ?? []),
		dmPolicy: account?.dmPolicy ?? CHANNEL_DEFAULT_DM_POLICY,
		disabledReason: enabled ? undefined : 'Account disabled.',
		unconfiguredReason: configured ? undefined : 'Channel account has no saved provider settings.',
	};
}

function listCatalogAccountIds(config: CatalogChannelConfig): string[] {
	const accountIds = Object.keys(config.accounts ?? {});
	return accountIds.length > 0 ? normalizeList(accountIds) : [CHANNEL_DEFAULT_ACCOUNT_ID];
}

function defaultCatalogAccountId(config: CatalogChannelConfig): string {
	return config.defaultAccountId?.trim() || CHANNEL_DEFAULT_ACCOUNT_ID;
}

function resolveAccountConfig(
	config: CatalogChannelConfig,
	accountId: string
): ChannelAccountProperties | undefined {
	const account = config.accounts?.[accountId];
	if (accountId !== CHANNEL_DEFAULT_ACCOUNT_ID) return account;
	return mergeAccountConfig(config, account);
}

function mergeAccountConfig(
	config: CatalogChannelConfig,
	account: ChannelAccountProperties | undefined
): ChannelAccountProperties {
	return {
		label: account?.label ?? config.label,
		enabled: account?.enabled,
		token: account?.token ?? config.token,
		secret: account?.secret ?? config.secret,
		serverUrl: account?.serverUrl ?? config.serverUrl,
		webhookUrl: account?.webhookUrl ?? config.webhookUrl,
		appId: account?.appId ?? config.appId,
		clientId: account?.clientId ?? config.clientId,
		clientSecret: account?.clientSecret ?? config.clientSecret,
		username: account?.username ?? config.username,
		phoneNumber: account?.phoneNumber ?? config.phoneNumber,
		botUserId: account?.botUserId ?? config.botUserId,
		defaultTarget: account?.defaultTarget ?? config.defaultTarget,
		allowFrom: account?.allowFrom ?? config.allowFrom,
		groupAllowFrom: account?.groupAllowFrom ?? config.groupAllowFrom,
		dmPolicy: account?.dmPolicy ?? config.dmPolicy,
		heartbeat: account?.heartbeat ?? config.heartbeat,
	};
}

function isConfiguredAccount(account: ChannelAccountProperties | undefined): boolean {
	if (!account) return false;
	return CONFIGURATION_FIELDS.some((field) => Boolean(account[field]?.trim()));
}

function parseExplicitTarget(
	channelId: ChannelType,
	targetPrefixes: readonly string[],
	target: string
): ChannelParsedTarget | null {
	const trimmed = target.trim();
	const lower = trimmed.toLowerCase();
	const prefix = targetPrefixes.find((candidate) =>
		lower.startsWith(`${candidate.toLowerCase()}:`)
	);
	if (!prefix) return null;

	const rawTarget = trimmed.slice(prefix.length + 1).trim();
	if (!rawTarget) return null;
	const { accountId, targetWithThread } = splitAccountTarget(rawTarget);
	const { targetId, threadId } = splitThreadTarget(targetWithThread);
	if (!targetId) return null;

	return {
		channelId,
		accountId,
		targetId,
		threadId,
		chatType: threadId ? 'thread' : inferTargetChatType(targetId),
		raw: trimmed,
	};
}

function splitAccountTarget(value: string): {
	accountId?: string;
	targetWithThread: string;
} {
	const slashIndex = value.indexOf('/');
	if (slashIndex <= 0) return { targetWithThread: value.trim() };
	const accountId = value.slice(0, slashIndex).trim();
	const targetWithThread = value.slice(slashIndex + 1).trim();
	if (!accountId || accountId.includes(':') || !targetWithThread) {
		return { targetWithThread: value.trim() };
	}
	return { accountId, targetWithThread };
}

function splitThreadTarget(value: string): { targetId: string; threadId?: string } {
	const hashIndex = value.indexOf('#');
	if (hashIndex <= 0 || hashIndex === value.length - 1) return { targetId: value.trim() };
	return {
		targetId: value.slice(0, hashIndex).trim(),
		threadId: value.slice(hashIndex + 1).trim() || undefined,
	};
}

function inferTargetChatType(target: string): ChannelChatType {
	const trimmed = target.trim();
	if (trimmed.startsWith('#')) return 'channel';
	if (trimmed.startsWith('-') || trimmed.startsWith('!')) return 'group';
	return 'dm';
}

function resolveCatalogConversation(target: ChannelParsedTarget): ChannelConversationResolution {
	const baseConversationId = [target.channelId, target.accountId, target.targetId]
		.filter(Boolean)
		.join(':');
	const threadConversationId = target.threadId
		? `${baseConversationId}:${target.threadId}`
		: undefined;
	return {
		baseConversationId,
		threadId: target.threadId,
		parentConversationCandidates: threadConversationId
			? [threadConversationId, baseConversationId]
			: [baseConversationId],
		deliveryTarget: target.targetId,
		sessionTarget: threadConversationId ?? baseConversationId,
	};
}

function normalizeCatalogInbound(
	channelId: ChannelType,
	message: ChannelInboundMessage,
	accountId: string
): ChannelNormalizedInboundMessage {
	const messageId = message.messageId ?? `${message.chatId}:${message.from}:${message.text}`;
	return {
		channelId,
		accountId,
		senderId: message.from,
		senderName: message.fromName,
		targetId: message.chatId,
		chatType: message.chatType ?? inferTargetChatType(message.chatId),
		messageId,
		threadId: message.threadId,
		text: message.text,
		media: [],
		provenance: message.provenance ?? {},
		idempotencyKey: [channelId, accountId, message.chatId, message.threadId, messageId]
			.filter(Boolean)
			.join(':'),
		receivedAt: Date.now(),
	};
}

function normalizeList(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
