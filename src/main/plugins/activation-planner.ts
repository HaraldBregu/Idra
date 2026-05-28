import {
	normalizeConnectorName,
	type ConnectorActivationCapability,
	type ConnectorDiagnostic,
} from './manifest';
import type { ConnectorManifestRecord } from './discovery';

export type ConnectorActivationTrigger =
	| { kind: 'provider'; provider: string }
	| { kind: 'channel'; channel: string }
	| { kind: 'command'; command: string }
	| { kind: 'route'; route: string }
	| { kind: 'agentHarness'; runtime: string }
	| { kind: 'tool'; tool: string }
	| { kind: 'capability'; capability: ConnectorActivationCapability };

export type ConnectorActivationReason =
	| 'activation-agent-harness-hint'
	| 'activation-capability-hint'
	| 'activation-channel-hint'
	| 'activation-command-hint'
	| 'activation-provider-hint'
	| 'activation-route-hint'
	| 'manifest-channel-owner'
	| 'manifest-command-alias'
	| 'manifest-hook-owner'
	| 'manifest-provider-owner'
	| 'manifest-setup-provider-owner'
	| 'manifest-tool-contract';

export interface ConnectorActivationPlanEntry {
	pluginId: string;
	origin: ConnectorManifestRecord['origin'];
	reasons: ConnectorActivationReason[];
}

export interface ConnectorActivationPlan {
	trigger: ConnectorActivationTrigger;
	pluginIds: string[];
	entries: ConnectorActivationPlanEntry[];
	diagnostics: ConnectorDiagnostic[];
}

export interface ResolveConnectorActivationPlanOptions {
	trigger: ConnectorActivationTrigger;
	records: readonly ConnectorManifestRecord[];
	diagnostics?: readonly ConnectorDiagnostic[];
	onlyPluginIds?: readonly string[];
	origin?: ConnectorManifestRecord['origin'];
}

export function resolveConnectorActivationPlan(
	options: ResolveConnectorActivationPlanOptions
): ConnectorActivationPlan {
	const only = options.onlyPluginIds
		? new Set(options.onlyPluginIds.map(normalizeConnectorName))
		: undefined;
	const entries = options.records
		.flatMap((record) => {
			if (options.origin && record.origin !== options.origin) return [];
			if (only && !only.has(normalizeConnectorName(record.id))) return [];
			const reasons = listActivationReasons(record, options.trigger);
			return reasons.length > 0
				? [{ pluginId: record.id, origin: record.origin, reasons }]
				: [];
		})
		.sort((left, right) => left.pluginId.localeCompare(right.pluginId));

	return {
		trigger: options.trigger,
		pluginIds: [...new Set(entries.map((entry) => entry.pluginId))],
		entries,
		diagnostics: [...(options.diagnostics ?? [])],
	};
}

function listActivationReasons(
	record: ConnectorManifestRecord,
	trigger: ConnectorActivationTrigger
): ConnectorActivationReason[] {
	const manifest = record.manifest;
	switch (trigger.kind) {
		case 'provider':
			return dedupe([
				hasNormalized(manifest.activation?.onProviders, trigger.provider) ? 'activation-provider-hint' : null,
				hasNormalized(manifest.providers, trigger.provider) ? 'manifest-provider-owner' : null,
				hasNormalized(manifest.setup?.providers?.map((provider) => provider.id), trigger.provider)
					? 'manifest-setup-provider-owner'
					: null,
			]);
		case 'channel':
			return dedupe([
				hasNormalized(manifest.activation?.onChannels, trigger.channel) ? 'activation-channel-hint' : null,
				hasNormalized(manifest.channels, trigger.channel) ? 'manifest-channel-owner' : null,
			]);
		case 'command':
			return dedupe([
				hasNormalized(manifest.activation?.onCommands, trigger.command) ? 'activation-command-hint' : null,
				hasNormalized(aliasNames(record), trigger.command) ? 'manifest-command-alias' : null,
			]);
		case 'route':
			return hasNormalized(manifest.activation?.onRoutes, trigger.route)
				? ['activation-route-hint']
				: [];
		case 'agentHarness':
			return hasNormalized(manifest.activation?.onAgentHarnesses, trigger.runtime)
				? ['activation-agent-harness-hint']
				: [];
		case 'tool':
			return hasNormalized(manifest.contracts.tools, trigger.tool) ? ['manifest-tool-contract'] : [];
		case 'capability':
			return capabilityReasons(record, trigger.capability);
	}
}

function capabilityReasons(
	record: ConnectorManifestRecord,
	capability: ConnectorActivationCapability
): ConnectorActivationReason[] {
	const manifest = record.manifest;
	switch (capability) {
		case 'provider':
			return dedupe([
				manifest.activation?.onCapabilities?.includes('provider') ? 'activation-capability-hint' : null,
				hasValues(manifest.activation?.onProviders) ? 'activation-provider-hint' : null,
				hasValues(manifest.providers) ? 'manifest-provider-owner' : null,
				hasValues(manifest.setup?.providers) ? 'manifest-setup-provider-owner' : null,
			]);
		case 'channel':
			return dedupe([
				manifest.activation?.onCapabilities?.includes('channel') ? 'activation-capability-hint' : null,
				hasValues(manifest.activation?.onChannels) ? 'activation-channel-hint' : null,
				hasValues(manifest.channels) ? 'manifest-channel-owner' : null,
			]);
		case 'tool':
			return dedupe([
				manifest.activation?.onCapabilities?.includes('tool') ? 'activation-capability-hint' : null,
				hasValues(manifest.contracts.tools) ? 'manifest-tool-contract' : null,
			]);
		case 'hook':
			return dedupe([
				manifest.activation?.onCapabilities?.includes('hook') ? 'activation-capability-hint' : null,
				hasValues(manifest.contracts.agentToolResultMiddleware) ? 'manifest-hook-owner' : null,
			]);
	}
}

function aliasNames(record: ConnectorManifestRecord): string[] {
	return record.manifest.commandAliases.flatMap((alias) =>
		[alias.name, alias.id, alias.command, alias.cliCommand].filter((value): value is string => !!value)
	);
}

function hasNormalized(values: readonly string[] | undefined, expected: string): boolean {
	const normalized = normalizeConnectorName(expected);
	return values?.some((value) => normalizeConnectorName(value) === normalized) ?? false;
}

function hasValues(values: readonly unknown[] | undefined): boolean {
	return (values?.length ?? 0) > 0;
}

function dedupe(
	reasons: readonly (ConnectorActivationReason | null)[]
): ConnectorActivationReason[] {
	return [...new Set(reasons.filter((reason): reason is ConnectorActivationReason => !!reason))];
}
