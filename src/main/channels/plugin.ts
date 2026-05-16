import type {
	ChannelCapabilities,
	ChannelConversationBindingsAdapter,
	ChannelMetadata,
	ChannelMessagingAdapter,
	ChannelPlugin,
	ChannelSecurityAdapter,
	ChannelThreadingAdapter,
} from './types';
import type { ChannelType } from '../../shared/channels';

const DEFAULT_CAPABILITIES: ChannelCapabilities = {
	inbound: true,
	outbound: true,
	text: true,
	media: false,
	voice: false,
	polls: false,
	receipts: true,
	threading: true,
	groups: true,
	setup: true,
	longRunningGateway: true,
	durableDelivery: ['text'],
	receiveAckPolicy: 'manual',
};

export interface ChannelPluginRegistration {
	plugin: ChannelPlugin;
}

export interface ChannelPluginApi {
	registerChannel(registration: ChannelPluginRegistration): void;
}

export interface ChannelPluginEntry<TConfig = unknown, TSetupInput = unknown> {
	id: ChannelType;
	name: string;
	description: string;
	register(api: ChannelPluginApi): void;
	plugin: ChannelPlugin<TConfig, TSetupInput>;
}

export interface BundledChannelEntry {
	id: ChannelType;
	name: string;
	description: string;
	pluginModule: string;
	pluginExport: string;
	setupEntry?: string;
	runtimeSetter?: string;
	secretsEntry?: string;
	accountInspector?: string;
	fullRuntimeRegistration?: string;
}

export function createChannelPluginBase<TConfig, TSetupInput>(options: {
	id: ChannelType;
	meta: ChannelMetadata;
	capabilities?: Partial<ChannelCapabilities>;
}): Pick<ChannelPlugin<TConfig, TSetupInput>, 'id' | 'meta' | 'capabilities'> {
	return {
		id: options.id,
		meta: options.meta,
		capabilities: {
			...DEFAULT_CAPABILITIES,
			...(options.capabilities ?? {}),
		},
	};
}

export function createChatChannelPlugin<TConfig, TSetupInput>(
	options: Omit<
		ChannelPlugin<TConfig, TSetupInput>,
		'capabilities' | 'security' | 'threading' | 'conversationBindings'
	> & {
		capabilities?: Partial<ChannelCapabilities>;
		security?: ChannelSecurityAdapter;
		threading?: ChannelThreadingAdapter;
		messaging?: ChannelMessagingAdapter;
		conversationBindings?: ChannelConversationBindingsAdapter;
	}
): ChannelPlugin<TConfig, TSetupInput> {
	const base = createChannelPluginBase<TConfig, TSetupInput>({
		id: options.id,
		meta: options.meta,
		capabilities: options.capabilities,
	});

	return {
		...options,
		...base,
		security: options.security ?? createScopedDmSecurityAdapter(),
		threading: options.threading ?? createReplyThreadingAdapter(options.id),
		conversationBindings:
			options.conversationBindings ?? createDefaultConversationBindingsAdapter(),
	};
}

export function defineChannelPluginEntry<TConfig, TSetupInput>(
	plugin: ChannelPlugin<TConfig, TSetupInput>
): ChannelPlugin<TConfig, TSetupInput> {
	return plugin;
}

export function defineChannelRuntimePluginEntry<TConfig, TSetupInput>(
	plugin: ChannelPlugin<TConfig, TSetupInput>
): ChannelPluginEntry<TConfig, TSetupInput> {
	return {
		id: plugin.id,
		name: plugin.meta.name,
		description: plugin.meta.description,
		plugin,
		register(api) {
			api.registerChannel({ plugin });
		},
	};
}

export function defineBundledChannelEntry(entry: BundledChannelEntry): BundledChannelEntry {
	return entry;
}

export function createScopedDmSecurityAdapter(): ChannelSecurityAdapter {
	return {
		resolveDmPolicy(account) {
			return account.dmPolicy ?? 'allowlist';
		},
		canReceive(message, account) {
			if (!account.enabled) {
				return { allowed: false, reason: 'account_disabled' };
			}
			if (!account.configured) {
				return { allowed: false, reason: 'account_not_configured' };
			}
			if (!message.text.trim()) {
				return { allowed: false, reason: 'empty_text' };
			}
			if (message.chatType === 'dm') {
				const dmPolicy = account.dmPolicy ?? 'allowlist';
				if (dmPolicy === 'open') return { allowed: true };
				if (dmPolicy === 'pairing') return { allowed: false, reason: 'pairing_required' };
				if (dmPolicy === 'deny') return { allowed: false, reason: 'dm_denied' };
				if (!account.allowFrom.includes(message.senderId)) {
					return { allowed: false, reason: 'sender_not_allowed' };
				}
			}
			if (
				message.chatType !== 'dm' &&
				account.groupAllowFrom &&
				account.groupAllowFrom.length > 0 &&
				!account.groupAllowFrom.includes(message.targetId)
			) {
				return { allowed: false, reason: 'route_not_allowed' };
			}
			return { allowed: true };
		},
	};
}

export function createReplyThreadingAdapter(channelId: ChannelType): ChannelThreadingAdapter {
	return {
		replyMode: 'all',
		getSessionKey(message) {
			return [channelId, message.accountId, message.targetId, message.threadId]
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
}

function createDefaultConversationBindingsAdapter(): ChannelConversationBindingsAdapter {
	return {
		supportsCurrentConversationBinding: true,
		defaultTopLevelPlacement: 'thread',
	};
}
