import { CHANNEL_CATALOG, type ChannelCatalogEntry } from './catalog';
import { createChannelPluginBase, defineChannelPluginEntry } from './plugin';
import type {
	ChannelAccountSnapshot,
	ChannelConfigAdapter,
	ChannelPlugin,
} from './types';
import type { GenericChannelProperties } from '../../shared/channels';

const emptyConfig: ChannelConfigAdapter<GenericChannelProperties> = {
	listAccounts(config) {
		const ids = listGenericAccountIds(config);
		return ids.map((id) => toAccount(id, config));
	},
	listAccountIds(config) {
		return listGenericAccountIds(config);
	},
	resolveAccount(config, accountId = defaultGenericAccountId(config) ?? 'default') {
		if (!listGenericAccountIds(config).includes(accountId)) return null;
		return toAccount(accountId, config);
	},
	inspectAccount(config, accountId) {
		return emptyConfig.resolveAccount(config, accountId);
	},
	describeAccount(config, accountId) {
		return emptyConfig.resolveAccount(config, accountId);
	},
	getDefaultAccount(config) {
		return emptyConfig.resolveAccount(config, defaultGenericAccountId(config) ?? 'default');
	},
	defaultAccountId(config) {
		return defaultGenericAccountId(config);
	},
	isEnabled(config, accountId) {
		return emptyConfig.resolveAccount(config, accountId)?.enabled ?? false;
	},
	isConfigured(config, accountId) {
		return emptyConfig.resolveAccount(config, accountId)?.configured ?? false;
	},
	disabledReason(config, accountId) {
		return emptyConfig.resolveAccount(config, accountId)?.disabledReason ?? null;
	},
	unconfiguredReason(config, accountId) {
		return emptyConfig.resolveAccount(config, accountId)?.unconfiguredReason ?? null;
	},
	getAllowlist(config, accountId) {
		return emptyConfig.resolveAllowFrom(config, accountId);
	},
	resolveAllowFrom(config, accountId) {
		return emptyConfig.resolveAccount(config, accountId)?.allowFrom ?? [];
	},
	formatAllowFrom(config, accountId) {
		const allowFrom = emptyConfig.resolveAllowFrom(config, accountId);
		return allowFrom.length > 0 ? allowFrom.join(', ') : 'none';
	},
	getDefaultTarget(config, accountId) {
		return emptyConfig.resolveDefaultTo(config, accountId);
	},
	resolveDefaultTo(config, accountId) {
		return emptyConfig.resolveAccount(config, accountId)?.defaultTargetId ?? null;
	},
};

export function createCatalogOnlyChannelPlugin(
	entry: ChannelCatalogEntry
): ChannelPlugin<GenericChannelProperties> {
	return defineChannelPluginEntry({
		...createChannelPluginBase<GenericChannelProperties, never>({
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
		}),
		config: emptyConfig,
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
	});
}

export function createBundledCatalogPlugins(): ChannelPlugin[] {
	return CHANNEL_CATALOG.map(createCatalogOnlyChannelPlugin);
}

function toAccount(id: string, config: GenericChannelProperties): ChannelAccountSnapshot {
	const account = config.accounts?.[id];
	const enabled = config.enabled !== false && account?.enabled !== false;
	return {
		id,
		label: account?.label?.trim() || `${id} account`,
		enabled,
		configured: false,
		defaultTargetId: account?.defaultTarget,
		allowFrom: normalizeList(account?.allowFrom ?? []),
		groupAllowFrom: normalizeList(account?.groupAllowFrom ?? []),
		dmPolicy: account?.dmPolicy ?? 'deny',
		disabledReason: enabled ? undefined : 'Account disabled.',
		unconfiguredReason: 'Channel runtime is not configured.',
	};
}

function listGenericAccountIds(config: GenericChannelProperties): string[] {
	const accountIds = Object.keys(config.accounts ?? {});
	return accountIds.length > 0 ? accountIds : ['default'];
}

function defaultGenericAccountId(config: GenericChannelProperties): string {
	return config.defaultAccountId?.trim() || 'default';
}

function normalizeList(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
