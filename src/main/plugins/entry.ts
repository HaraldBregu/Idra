import type { ConnectorJsonSchema } from './manifest';
import type {
	ConnectorModelCatalogProviderRegistration,
	ConnectorProviderRegistration,
} from './registry';
import type { OpenClawConnectorApi } from './api-builder';

export interface OpenClawConnectorEntry {
	id: string;
	name: string;
	description: string;
	kind?: string | string[];
	configSchema: ConnectorJsonSchema;
	register(api: OpenClawConnectorApi): void | Promise<void>;
}

export interface DefinePluginEntryOptions {
	id: string;
	name: string;
	description: string;
	kind?: string | string[];
	configSchema?: ConnectorJsonSchema | (() => ConnectorJsonSchema);
	register(api: OpenClawConnectorApi): void | Promise<void>;
}

export interface SingleProviderPluginOptions {
	id: string;
	name: string;
	description: string;
	kind?: string | string[];
	configSchema?: ConnectorJsonSchema | (() => ConnectorJsonSchema);
	provider?: Omit<ConnectorProviderRegistration, 'id'> & {
		id?: string;
		modelCatalog?: Omit<ConnectorModelCatalogProviderRegistration, 'provider'>;
	};
	register?(api: OpenClawConnectorApi): void | Promise<void>;
}

const EMPTY_CONFIG_SCHEMA: ConnectorJsonSchema = {
	type: 'object',
	properties: {},
	additionalProperties: false,
};

export function definePluginEntry(options: DefinePluginEntryOptions): OpenClawConnectorEntry {
	let cachedConfigSchema: ConnectorJsonSchema | undefined;
	return {
		id: options.id,
		name: options.name,
		description: options.description,
		...(options.kind ? { kind: options.kind } : {}),
		get configSchema() {
			if (!cachedConfigSchema) {
				cachedConfigSchema =
					typeof options.configSchema === 'function'
						? options.configSchema()
						: options.configSchema ?? EMPTY_CONFIG_SCHEMA;
			}
			return cachedConfigSchema;
		},
		register: options.register,
	};
}

export function defineSingleProviderPluginEntry(
	options: SingleProviderPluginOptions
): OpenClawConnectorEntry {
	return definePluginEntry({
		id: options.id,
		name: options.name,
		description: options.description,
		...(options.kind ? { kind: options.kind } : {}),
		...(options.configSchema ? { configSchema: options.configSchema } : {}),
		async register(api) {
			const provider = options.provider;
			if (provider) {
				const providerId = provider.id ?? options.id;
				const { modelCatalog, ...providerRegistration } = provider;
				api.registerProvider({
					...providerRegistration,
					id: providerId,
				});
				if (modelCatalog) {
					api.registerModelCatalogProvider({
						...modelCatalog,
						provider: providerId,
					});
				}
			}
			await options.register?.(api);
		},
	});
}
