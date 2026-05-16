import type { TelegramChannelProperties } from '../../../shared/channels';
import { createChannelPluginBase, defineChannelPluginEntry } from '../plugin';
import type {
	ChannelAccountSnapshot,
	ChannelConfigAdapter,
	ChannelDoctorIssue,
	ChannelPlugin,
	ChannelSecurityAdapter,
	ChannelSetupAdapter,
	ChannelThreadingAdapter,
} from '../types';

export type TelegramSetupInput = TelegramChannelProperties;

const config: ChannelConfigAdapter<TelegramChannelProperties> = {
	listAccounts(channelConfig) {
		return [toAccount(channelConfig)];
	},
	resolveAccount(channelConfig, accountId = 'default') {
		const account = toAccount(channelConfig);
		return account.id === accountId ? account : null;
	},
	inspectAccount(channelConfig, accountId = 'default') {
		return this.resolveAccount(channelConfig, accountId);
	},
	getDefaultAccount(channelConfig) {
		return toAccount(channelConfig);
	},
	isEnabled(channelConfig, accountId = 'default') {
		return Boolean(this.resolveAccount(channelConfig, accountId)?.enabled);
	},
	isConfigured(channelConfig, accountId = 'default') {
		return Boolean(this.resolveAccount(channelConfig, accountId)?.configured);
	},
	getAllowlist(channelConfig) {
		return normalizeAllowFrom(channelConfig.allowFrom);
	},
	getDefaultTarget() {
		return null;
	},
};

const setup: ChannelSetupAdapter<TelegramSetupInput, TelegramChannelProperties> = {
	validate(input) {
		const errors: string[] = [];
		if (!input.token.trim()) errors.push('Telegram bot token is required.');
		return errors;
	},
	apply(_current, input) {
		const config: TelegramChannelProperties = {
			token: input.token.trim(),
			allowFrom: normalizeAllowFrom(input.allowFrom),
		};

		return { config, warnings: [] };
	},
};

const security: ChannelSecurityAdapter = {
	canReceive(message, account) {
		if (!account.enabled || !account.configured) {
			return { allowed: false, reason: 'account_not_configured' };
		}
		if (message.senderId === account.id) {
			return { allowed: false, reason: 'self_message' };
		}
		if (account.allowFrom.length > 0 && !account.allowFrom.includes(message.senderId)) {
			return { allowed: false, reason: 'sender_not_allowed' };
		}
		if (!message.text.trim()) {
			return { allowed: false, reason: 'empty_text' };
		}
		return { allowed: true };
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

export const telegramChannelPlugin: ChannelPlugin<TelegramChannelProperties, TelegramSetupInput> =
	defineChannelPluginEntry({
		...createChannelPluginBase<TelegramChannelProperties, TelegramSetupInput>({
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
		}),
		config,
		setup,
		security,
		threading,
		envVars: ['TELEGRAM_BOT_TOKEN'],
		doctor: {
			inspect(channelConfig) {
				const issues: ChannelDoctorIssue[] = [];
				if (!channelConfig.token.trim()) {
					issues.push({ severity: 'error' as const, message: 'Telegram bot token is missing.' });
				}
				if (channelConfig.allowFrom.length === 0) {
					issues.push({
						severity: 'warning' as const,
						message: 'Telegram allowlist is empty; any Telegram sender can message this bot.',
					});
				}
				return issues;
			},
		},
	});

function toAccount(channelConfig: TelegramChannelProperties): ChannelAccountSnapshot {
	const configured = Boolean(channelConfig.token.trim());
	return {
		id: 'default',
		label: 'Telegram bot',
		enabled: configured,
		configured,
		allowFrom: normalizeAllowFrom(channelConfig.allowFrom),
	};
}

function normalizeAllowFrom(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
