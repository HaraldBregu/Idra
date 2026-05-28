import type {
	ChannelDmPolicy,
	TelegramChannelAccountProperties,
	TelegramChannelProperties,
} from '../../../shared/channels';
import { createChatChannelPlugin, createScopedDmSecurityAdapter, defineChannelPluginEntry } from '../plugin';
import { normalizeTelegramTextMessage } from './receive';
import type {
	ChannelAccountSnapshot,
	ChannelActionsAdapter,
	ChannelConfigAdapter,
	ChannelDoctorIssue,
	ChannelMessagingAdapter,
	ChannelParsedTarget,
	ChannelPlugin,
	ChannelSecurityAdapter,
	ChannelSetupAdapter,
	ChannelThreadingAdapter,
} from '../types';

export type TelegramSetupInput = TelegramChannelProperties;

const config: ChannelConfigAdapter<TelegramChannelProperties> = {
	listAccounts(channelConfig) {
		return listTelegramAccountIds(channelConfig).map((accountId) => toAccount(channelConfig, accountId));
	},
	listAccountIds(channelConfig) {
		return listTelegramAccountIds(channelConfig);
	},
	resolveAccount(channelConfig, accountId = defaultTelegramAccountId(channelConfig)) {
		const normalizedAccountId = accountId.trim() || defaultTelegramAccountId(channelConfig);
		if (!listTelegramAccountIds(channelConfig).includes(normalizedAccountId)) return null;
		return toAccount(channelConfig, normalizedAccountId);
	},
	inspectAccount(channelConfig, accountId) {
		return config.resolveAccount(channelConfig, accountId);
	},
	describeAccount(channelConfig, accountId) {
		return config.resolveAccount(channelConfig, accountId);
	},
	getDefaultAccount(channelConfig) {
		return config.resolveAccount(channelConfig, defaultTelegramAccountId(channelConfig));
	},
	defaultAccountId(channelConfig) {
		return defaultTelegramAccountId(channelConfig);
	},
	isEnabled(channelConfig, accountId = 'default') {
		return Boolean(config.resolveAccount(channelConfig, accountId)?.enabled);
	},
	isConfigured(channelConfig, accountId = 'default') {
		return Boolean(config.resolveAccount(channelConfig, accountId)?.configured);
	},
	disabledReason(channelConfig, accountId = 'default') {
		return config.resolveAccount(channelConfig, accountId)?.disabledReason ?? null;
	},
	unconfiguredReason(channelConfig, accountId = 'default') {
		return config.resolveAccount(channelConfig, accountId)?.unconfiguredReason ?? null;
	},
	getAllowlist(channelConfig, accountId = 'default') {
		return config.resolveAllowFrom(channelConfig, accountId);
	},
	resolveAllowFrom(channelConfig, accountId = 'default') {
		return config.resolveAccount(channelConfig, accountId)?.allowFrom ?? [];
	},
	formatAllowFrom(channelConfig, accountId = 'default') {
		const allowFrom = config.resolveAllowFrom(channelConfig, accountId);
		return allowFrom.length > 0 ? allowFrom.join(', ') : 'none';
	},
	getDefaultTarget(channelConfig, accountId = 'default') {
		return config.resolveDefaultTo(channelConfig, accountId);
	},
	resolveDefaultTo(channelConfig, accountId = 'default') {
		return config.resolveAccount(channelConfig, accountId)?.defaultTargetId ?? null;
	},
};

const setup: ChannelSetupAdapter<TelegramSetupInput, TelegramChannelProperties> = {
	validate(input) {
		const errors: string[] = [];
		if (!hasConfiguredToken(input)) errors.push('Telegram bot token is required.');
		return errors;
	},
	apply(_current, input) {
		const config: TelegramChannelProperties = {
			token: input.token.trim(),
			allowFrom: normalizeAllowFrom(input.allowFrom),
		};
		if (input.enabled !== undefined) config.enabled = input.enabled;
		if (input.defaultAccountId?.trim()) config.defaultAccountId = input.defaultAccountId.trim();
		if (input.defaultTarget?.trim()) config.defaultTarget = input.defaultTarget.trim();
		if (input.dmPolicy) config.dmPolicy = input.dmPolicy;
		if (input.groupAllowFrom) config.groupAllowFrom = normalizeAllowFrom(input.groupAllowFrom);
		const accounts = normalizeAccounts(input.accounts);
		if (Object.keys(accounts).length > 0) config.accounts = accounts;

		return { config, warnings: [] };
	},
};

const scopedDmSecurity = createScopedDmSecurityAdapter();

const security: ChannelSecurityAdapter = {
	resolveDmPolicy(account, message) {
		return scopedDmSecurity.resolveDmPolicy?.(account, message) ?? 'allowlist';
	},
	canReceive(message, account) {
		return scopedDmSecurity.canReceive(message, account);
	},
};

const threading: ChannelThreadingAdapter = {
	replyMode: 'all',
	getSessionKey(message) {
		return ['telegram', message.accountId, message.targetId, message.threadId]
			.filter(Boolean)
			.join(':');
	},
	resolveReplyTarget(message) {
		return {
			to: message.chatId,
			threadId: message.threadId,
			replyToMessageId: message.messageId,
		};
	},
};

const messaging: ChannelMessagingAdapter = {
	targetPrefixes: ['telegram'],
	normalizeTarget(target) {
		const parsed = this.parseExplicitTarget(target);
		if (parsed) return parsed.targetId;
		const trimmed = target.trim();
		return trimmed ? trimmed : null;
	},
	parseExplicitTarget(target) {
		const trimmed = target.trim();
		if (!trimmed.toLowerCase().startsWith('telegram:')) return null;
		const rawTarget = trimmed.slice('telegram:'.length);
		const [targetWithAccount, threadId] = rawTarget.split('#', 2);
		const [maybeAccountId, maybeTargetId] = targetWithAccount.includes('/')
			? targetWithAccount.split('/', 2)
			: [undefined, targetWithAccount];
		const targetId = maybeTargetId?.trim();
		if (!targetId) return null;
		return {
			channelId: 'telegram',
			accountId: maybeAccountId?.trim() || undefined,
			targetId,
			threadId: threadId?.trim() || undefined,
			chatType: threadId ? 'thread' : this.inferTargetChatType(targetId),
			raw: trimmed,
		};
	},
	inferTargetChatType(target) {
		if (target.includes('#')) return 'thread';
		return target.trim().startsWith('-') ? 'group' : 'dm';
	},
	resolveInboundConversation(message) {
		return resolveTelegramConversation({
			channelId: 'telegram',
			accountId: message.accountId,
			targetId: message.targetId,
			threadId: message.threadId,
			raw: message.targetId,
			chatType: message.chatType,
		});
	},
	resolveSessionConversation(target) {
		return resolveTelegramConversation(target);
	},
	resolveDeliveryTarget(target) {
		return target.targetId;
	},
	resolveSessionTarget(target) {
		return resolveTelegramConversation(target).sessionTarget;
	},
	resolveOutboundSessionRoute(message) {
		return (
			this.parseExplicitTarget(message.to) ?? {
				channelId: 'telegram',
				accountId: message.accountId,
				targetId: message.to,
				threadId: message.threadId,
				chatType: message.threadId ? 'thread' : this.inferTargetChatType(message.to),
				raw: message.to,
			}
		);
	},
	targetResolver(input) {
		return this.parseExplicitTarget(input);
	},
	formatTargetDisplay(target) {
		const account = target.accountId ? `${target.accountId}/` : '';
		const thread = target.threadId ? `#${target.threadId}` : '';
		return `telegram:${account}${target.targetId}${thread}`;
	},
	normalizeInbound(message, accountId) {
		return normalizeTelegramTextMessage({
			accountId,
			from: message.from,
			chatId: message.chatId,
			text: message.text,
			messageId: message.messageId,
			threadId: message.threadId,
			chatType: message.chatType,
			provenance: message.provenance,
		});
	},
};

const actions: ChannelActionsAdapter = {
	supportsAction(action) {
		return action === 'send';
	},
	resolveExecutionMode(action) {
		return action === 'send' ? 'gateway' : 'local';
	},
	prepareSendPayload(message) {
		return {
			message,
			channelData: {
				telegram: {
					chatId: message.to,
					threadId: message.threadId,
					replyToMessageId: message.replyToMessageId,
				},
			},
		};
	},
};

export const telegramChannelPlugin: ChannelPlugin<TelegramChannelProperties, TelegramSetupInput> =
	defineChannelPluginEntry(
		createChatChannelPlugin<TelegramChannelProperties, TelegramSetupInput>({
			id: 'telegram',
			meta: {
				name: 'Telegram',
				description: 'Receive Telegram bot messages and send agent replies.',
				version: '1.0.0',
			},
			capabilities: {
				media: false,
				voice: false,
				polls: false,
			},
			config,
			configSchema: {
				type: 'object',
				required: ['token', 'allowFrom'],
				properties: {
					token: { type: 'string', secret: true },
					allowFrom: { type: 'array', items: { type: 'string' } },
					dmPolicy: { enum: ['allowlist', 'pairing', 'open', 'deny'] },
					accounts: { type: 'object' },
				},
			},
			setup,
			security,
			threading,
			messaging,
			actions,
			envVars: ['TELEGRAM_BOT_TOKEN'],
			doctor: {
				inspect(channelConfig) {
					const issues: ChannelDoctorIssue[] = [];
					if (!hasConfiguredToken(channelConfig)) {
						issues.push({ severity: 'error' as const, message: 'Telegram bot token is missing.' });
					}
					for (const account of config.listAccounts(channelConfig)) {
						if (account.dmPolicy !== 'open' && account.allowFrom.length === 0) {
							issues.push({
								severity: 'warning' as const,
								message: `Telegram account ${account.id} has no DM allowlist; direct messages are denied unless dmPolicy is open.`,
							});
						}
					}
					return issues;
				},
			},
			secrets: {
				targets: ['TELEGRAM_BOT_TOKEN'],
				assignments: ['channel.telegram.token', 'channel.telegram.accounts.*.token'],
			},
		})
	);

function toAccount(channelConfig: TelegramChannelProperties, accountId: string): ChannelAccountSnapshot {
	const accountConfig = channelConfig.accounts?.[accountId];
	const token = (accountConfig?.token ?? (accountId === 'default' ? channelConfig.token : '')).trim();
	const enabled = channelConfig.enabled !== false && accountConfig?.enabled !== false;
	const configured = Boolean(token);
	const allowFrom = normalizeAllowFrom(accountConfig?.allowFrom ?? channelConfig.allowFrom);
	const groupAllowFrom = normalizeAllowFrom(
		accountConfig?.groupAllowFrom ?? channelConfig.groupAllowFrom ?? []
	);
	return {
		id: accountId,
		label: accountConfig?.label?.trim() || (accountId === 'default' ? 'Telegram bot' : accountId),
		enabled,
		configured,
		defaultTargetId:
			accountConfig?.defaultTarget?.trim() || channelConfig.defaultTarget?.trim() || undefined,
		allowFrom,
		groupAllowFrom,
		dmPolicy: resolveDmPolicy(accountConfig, channelConfig),
		disabledReason: enabled ? undefined : 'Telegram account is disabled.',
		unconfiguredReason: configured ? undefined : 'Telegram bot token is missing.',
	};
}

function normalizeAllowFrom(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function listTelegramAccountIds(channelConfig: TelegramChannelProperties): string[] {
	const accountIds = Object.keys(channelConfig.accounts ?? {})
		.map((accountId) => accountId.trim())
		.filter(Boolean);
	return accountIds.length > 0 ? normalizeAllowFrom(accountIds) : ['default'];
}

function defaultTelegramAccountId(channelConfig: TelegramChannelProperties): string {
	const configuredDefault = channelConfig.defaultAccountId?.trim();
	if (configuredDefault && listTelegramAccountIds(channelConfig).includes(configuredDefault)) {
		return configuredDefault;
	}
	return 'default';
}

function normalizeAccounts(
	accounts: TelegramChannelProperties['accounts']
): Record<string, TelegramChannelAccountProperties> {
	const normalized: Record<string, TelegramChannelAccountProperties> = {};
	for (const [accountId, account] of Object.entries(accounts ?? {})) {
		const id = accountId.trim();
		if (!id) continue;
		const next: TelegramChannelAccountProperties = {};
		if (account.label?.trim()) next.label = account.label.trim();
		if (account.enabled !== undefined) next.enabled = account.enabled;
		if (account.token?.trim()) next.token = account.token.trim();
		if (account.allowFrom) next.allowFrom = normalizeAllowFrom(account.allowFrom);
		if (account.groupAllowFrom) next.groupAllowFrom = normalizeAllowFrom(account.groupAllowFrom);
		if (account.defaultTarget?.trim()) next.defaultTarget = account.defaultTarget.trim();
		if (account.dmPolicy) next.dmPolicy = account.dmPolicy;
		normalized[id] = next;
	}
	return normalized;
}

function hasConfiguredToken(channelConfig: TelegramChannelProperties): boolean {
	if (channelConfig.token.trim()) return true;
	return Object.values(channelConfig.accounts ?? {}).some((account) => Boolean(account.token?.trim()));
}

function resolveDmPolicy(
	accountConfig: TelegramChannelAccountProperties | undefined,
	channelConfig: TelegramChannelProperties
): ChannelDmPolicy {
	return accountConfig?.dmPolicy ?? channelConfig.dmPolicy ?? 'allowlist';
}

function resolveTelegramConversation(target: ChannelParsedTarget) {
	const baseConversationId = ['telegram', target.accountId, target.targetId].filter(Boolean).join(':');
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
