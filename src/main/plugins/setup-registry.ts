import type { ConnectorManifestRecord } from './discovery';

export interface ConnectorSetupDescriptor {
	pluginId: string;
	name: string;
	description: string;
	providers: NonNullable<ConnectorManifestRecord['manifest']['setup']>['providers'];
	providerAuthEnvVars: Record<string, string[]>;
	channelEnvVars: Record<string, string[]>;
	configSchema: ConnectorManifestRecord['manifest']['configSchema'];
	uiHints: ConnectorManifestRecord['manifest']['uiHints'];
	requiresRuntime: boolean;
	setupEntry?: string;
}

export class ConnectorSetupRegistry {
	private readonly descriptors = new Map<string, ConnectorSetupDescriptor>();

	static fromManifestRecords(records: readonly ConnectorManifestRecord[]): ConnectorSetupRegistry {
		const registry = new ConnectorSetupRegistry();
		for (const record of records) registry.registerManifest(record);
		return registry;
	}

	registerManifest(record: ConnectorManifestRecord): void {
		this.descriptors.set(record.id, {
			pluginId: record.id,
			name: record.manifest.name,
			description: record.manifest.description,
			providers: record.manifest.setup?.providers ?? [],
			providerAuthEnvVars: record.manifest.providerAuthEnvVars,
			channelEnvVars: record.manifest.channelEnvVars,
			configSchema: record.manifest.configSchema,
			uiHints: record.manifest.uiHints,
			requiresRuntime: record.manifest.setup?.requiresRuntime === true,
			setupEntry: record.manifest.setupEntry,
		});
	}

	get(pluginId: string): ConnectorSetupDescriptor | undefined {
		return this.descriptors.get(pluginId);
	}

	list(): ConnectorSetupDescriptor[] {
		return [...this.descriptors.values()];
	}
}
