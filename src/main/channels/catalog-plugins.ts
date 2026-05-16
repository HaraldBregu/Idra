import { CHANNEL_CATALOG, type ChannelCatalogEntry } from './catalog';
import { createChannelPluginBase, defineChannelPluginEntry } from './plugin';
import type {
	ChannelAccountSnapshot,
	ChannelConfigAdapter,
	ChannelPlugin,
} from './types';
import type { ChannelType, GenericChannelProperties } from '../../shared/channels';

const emptyConfig: ChannelConfigAdapter<GenericChannelProperties> = {
	listAccounts(config) {
		const ids = this.listAccountIds(config);
		return ids.map((id) => toAccount(id, config));
	},
	listAccountIds(config) {
		const accountIds = Object.keys(config.accounts ?? {});
		return accountIds.length > 0 ? accountIds : ['default'];
	},
	resolveAccount(config, accountId = this.defaultAccountId(config) ?? 'default') {
		if (!this.listAccountIds(config).includes(accountId)) return null;
		return toAccount(accountId, config);
	},
	inspectAccount(config, accountId) {
		return this.resolveAccount(config, accountId);
	},
	describeAccount(config, accountId) {
		return this.resolveAccount(config, accountId);
	},
	getDefaultAccount(config) {
		return this.resolveAccount(config, this.defaultAccountId(config) ?? 'default');
	},
	defaultAccountId(config) {
		return config.defaultAccountId?.trim() || 'default';
	},
	isEnabled(config, accountId) {
		return this.resolveAccount(config, accountId)?.enabled ?? false;
	},
	isConfigured(config, accountId) {
		return this.resolveAccount(config, accountId)?.configured ?? false;
	},
	disabledReason(config, accountId) {
		return this.resolveAccount(config, accountId)?.disabledReason ?? null;
	},
	unconfiguredReason(config, accountId) {
		return this.resolveAccount(config, accountId)?.unconfiguredReason ?? null;
	},
	getAllowlist(config, accountId) {
		return this.resolveAllowFrom(config, accountId);
	},
	resolveAllowFrom(config, accountId) {
		return this.resolveAccount(config, accountId)?.allowFrom ?? [];
	},
	formatAllowFrom(config, accountId) {
		const allowFrom = this.resolveAllowFrom(config, accountId);
		return allowFrom.length > 0 ? allowFrom.join(', ') : 'none';
	},
	getDefaultTarget(config, accountId) {
		return this.resolveDefaultTo(config, accountId);
	},
	resolveDefaultTo(config, accountId) {
		return this.resolveAccount(config, accountId)?.defaultTargetId ?? null;
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

function normalizeList(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
