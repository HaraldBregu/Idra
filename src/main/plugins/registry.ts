import { PluginToolRegistry } from './tool-registry';
import type { PluginToolContext, PluginToolFactory } from './tool-types';
import {
	isAgentTool,
	markPluginTool,
	normalizeToolName,
	ToolAuthorizationError,
	type AgentTool,
} from '../tools/common';
import {
	normalizeManifestToolNames,
	type ConnectorDiagnostic,
	type ConnectorManifest,
} from './manifest';

export type ConnectorRegistrationMode =
	| 'full'
	| 'discovery'
	| 'tool-discovery'
	| 'setup-only'
	| 'setup-runtime'
	| 'cli-metadata';

export interface ConnectorAttribution {
	pluginId: string;
	source: string;
	rootDir?: string;
	mode: ConnectorRegistrationMode;
}

export interface ConnectorToolRegistration {
	name?: string;
	tool?: AgentTool;
	factory?: PluginToolFactory;
	optional?: boolean;
}

export interface ConnectorToolMetadataRegistration {
	name: string;
	optional?: boolean;
	[key: string]: unknown;
}

export interface ConnectorProviderRegistration {
	id: string;
	label?: string;
	docsPath?: string;
	aliases?: string[];
	envVars?: string[];
	auth?: unknown[];
	catalog?: unknown;
	[key: string]: unknown;
}

export interface ConnectorModelCatalogProviderRegistration {
	provider: string;
	kinds?: string[];
	staticCatalog?: unknown;
	liveCatalog?: unknown;
	[key: string]: unknown;
}

export interface RegisteredConnectorTool {
	name: string;
	optional: boolean;
	attribution: ConnectorAttribution;
	factory: PluginToolFactory;
}

export interface RegisteredConnectorValue<T = unknown> {
	key?: string;
	value: T;
	attribution: ConnectorAttribution;
}

export type ConnectorRegistrySurface =
	| 'hooks'
	| 'httpRoutes'
	| 'gatewayMethods'
	| 'cli'
	| 'commands'
	| 'services'
	| 'providers'
	| 'modelCatalogProviders'
	| 'webSearchProviders'
	| 'webFetchProviders'
	| 'speechProviders'
	| 'realtimeTranscriptionProviders'
	| 'realtimeVoiceProviders'
	| 'mediaUnderstandingProviders'
	| 'videoGenerationProviders'
	| 'musicGenerationProviders'
	| 'memoryEmbeddingProviders'
	| 'memoryCapabilities'
	| 'memoryPromptSupplements'
	| 'memoryCorpusSupplements'
	| 'channels'
	| 'migrationProviders'
	| 'agentHarnesses'
	| 'agentToolResultMiddleware'
	| 'contextEngines'
	| 'compactionProviders'
	| 'configMigrations'
	| 'autoEnableProbes'
	| 'sessionWorkflows'
	| 'runtimeLifecycle'
	| 'cleanup';

export class FridayConnectorRegistry {
	private readonly tools: RegisteredConnectorTool[] = [];
	private readonly toolMetadata = new Map<string, RegisteredConnectorValue<ConnectorToolMetadataRegistration>>();
	private readonly toolOwners = new Map<string, string>();
	private readonly values = new Map<ConnectorRegistrySurface, RegisteredConnectorValue[]>();
	private readonly diagnostics: ConnectorDiagnostic[] = [];
	private readonly runContext = new Map<string, unknown>();

	registerTool(
		registration: AgentTool | PluginToolFactory | ConnectorToolRegistration,
		manifest: ConnectorManifest,
		attribution: ConnectorAttribution
	): void {
		const normalized = normalizeToolRegistration(registration);
		if (!normalized) {
			throw new ToolAuthorizationError('Connector tool registration is invalid.', 'invalid_plugin_tool');
		}
		const names = normalized.tool ? [normalized.tool.name] : [normalized.name];
		for (const name of names) this.assertToolOwner(name, manifest, attribution, 'registerTool');

		this.tools.push({
			name: normalized.name,
			optional: normalized.optional,
			attribution,
			factory: normalized.factory,
		});
	}

	registerToolMetadata(
		metadata: ConnectorToolMetadataRegistration,
		manifest: ConnectorManifest,
		attribution: ConnectorAttribution
	): void {
		this.assertToolOwner(metadata.name, manifest, attribution, 'registerToolMetadata');
		const key = normalizeToolName(metadata.name);
		this.toolMetadata.set(key, { key, value: { ...metadata }, attribution });
	}

	registerProvider(registration: ConnectorProviderRegistration, attribution: ConnectorAttribution): void {
		this.registerValue('providers', registration, attribution, registration.id);
	}

	registerModelCatalogProvider(
		registration: ConnectorModelCatalogProviderRegistration,
		attribution: ConnectorAttribution
	): void {
		this.registerValue('modelCatalogProviders', registration, attribution, registration.provider);
	}

	registerValue<T>(
		surface: ConnectorRegistrySurface,
		value: T,
		attribution: ConnectorAttribution,
		key?: string
	): void {
		const values = this.values.get(surface) ?? [];
		values.push({ key, value, attribution });
		this.values.set(surface, values);
	}

	listTools(): RegisteredConnectorTool[] {
		return [...this.tools];
	}

	listToolMetadata(): RegisteredConnectorValue<ConnectorToolMetadataRegistration>[] {
		return [...this.toolMetadata.values()];
	}

	listValues<T = unknown>(surface: ConnectorRegistrySurface): RegisteredConnectorValue<T>[] {
		return [...((this.values.get(surface) as RegisteredConnectorValue<T>[] | undefined) ?? [])];
	}

	listProviders(): RegisteredConnectorValue<ConnectorProviderRegistration>[] {
		return this.listValues('providers');
	}

	listModelCatalogProviders(): RegisteredConnectorValue<ConnectorModelCatalogProviderRegistration>[] {
		return this.listValues('modelCatalogProviders');
	}

	listDiagnostics(): ConnectorDiagnostic[] {
		return [...this.diagnostics];
	}

	addDiagnostic(diagnostic: ConnectorDiagnostic): void {
		this.diagnostics.push(diagnostic);
	}

	async resolveTools(context: PluginToolContext, pluginId?: string): Promise<AgentTool[]> {
		const resolved: AgentTool[] = [];
		for (const registration of this.tools) {
			if (pluginId && registration.attribution.pluginId !== pluginId) continue;
			const produced = await registration.factory(context);
			const tools = produced === null || produced === undefined ? [] : Array.isArray(produced) ? produced : [produced];
			for (const tool of tools) {
				if (!isAgentTool(tool)) {
					throw new ToolAuthorizationError(
						`Connector ${registration.attribution.pluginId} returned an invalid tool.`,
						'invalid_plugin_tool'
					);
				}
				const owner = this.toolOwners.get(normalizeToolName(tool.name));
				if (owner !== registration.attribution.pluginId) {
					throw new ToolAuthorizationError(
						`Connector ${registration.attribution.pluginId} returned undeclared tool ${tool.name}.`,
						'undeclared_plugin_tool'
					);
				}
				resolved.push(markPluginTool(tool, registration.attribution.pluginId, registration.optional));
			}
		}
		return resolved;
	}

	toPluginToolRegistry(): PluginToolRegistry {
		const registry = new PluginToolRegistry();
		const pluginIds = [...new Set(this.tools.map((tool) => tool.attribution.pluginId))];
		for (const pluginId of pluginIds) {
			const pluginTools = this.tools.filter((tool) => tool.attribution.pluginId === pluginId);
			registry.register({
				manifest: {
					id: pluginId,
					tools: pluginTools.map((tool) => ({ name: tool.name, optional: tool.optional })),
				},
				factory: (context) => this.resolveTools(context, pluginId),
			});
		}
		return registry;
	}

	setRunContext(params: {
		pluginId: string;
		runId?: string;
		key: string;
		value: unknown;
	}): boolean {
		this.runContext.set(runContextKey(params.pluginId, params.runId, params.key), params.value);
		return true;
	}

	getRunContext(params: { pluginId: string; runId?: string; key: string }): unknown {
		return this.runContext.get(runContextKey(params.pluginId, params.runId, params.key));
	}

	clearRunContext(params: { pluginId: string; runId?: string; key?: string }): void {
		if (params.key) {
			this.runContext.delete(runContextKey(params.pluginId, params.runId, params.key));
			return;
		}
		const prefix = `${params.pluginId}:${params.runId ?? '*'}:`;
		for (const key of this.runContext.keys()) {
			if (key.startsWith(prefix)) this.runContext.delete(key);
		}
	}

	private assertToolOwner(
		toolName: string,
		manifest: ConnectorManifest,
		attribution: ConnectorAttribution,
		action: string
	): void {
		const normalized = normalizeToolName(toolName);
		const declared = new Set(normalizeManifestToolNames(manifest.contracts));
		if (!declared.has(normalized)) {
			const diagnostic = {
				level: 'error' as const,
				code: 'undeclared_tool_registration',
				pluginId: attribution.pluginId,
				source: attribution.source,
				message: `Connector ${attribution.pluginId} attempted to ${action} for undeclared tool ${toolName}.`,
				details: { toolName, declaredTools: [...declared] },
			};
			this.addDiagnostic(diagnostic);
			throw new ToolAuthorizationError(diagnostic.message, 'undeclared_plugin_tool', diagnostic.details);
		}
		const existingOwner = this.toolOwners.get(normalized);
		if (existingOwner && existingOwner !== attribution.pluginId) {
			const diagnostic = {
				level: 'error' as const,
				code: 'tool_owner_conflict',
				pluginId: attribution.pluginId,
				source: attribution.source,
				message: `Connector ${attribution.pluginId} attempted to ${action} for tool ${toolName}, already owned by ${existingOwner}.`,
				details: { toolName, existingOwner },
			};
			this.addDiagnostic(diagnostic);
			throw new ToolAuthorizationError(diagnostic.message, 'plugin_tool_conflict', diagnostic.details);
		}
		this.toolOwners.set(normalized, attribution.pluginId);
	}
}

function normalizeToolRegistration(
	registration: AgentTool | PluginToolFactory | ConnectorToolRegistration
):
	| {
			name: string;
			optional: boolean;
			tool?: AgentTool;
			factory: PluginToolFactory;
	  }
	| null {
	if (typeof registration === 'function') return null;
	if (isAgentTool(registration)) {
		const tool = registration;
		return { name: tool.name, optional: false, tool, factory: () => tool };
	}
	const tool = registration.tool;
	const factory = registration.factory;
	const name = registration.name ?? tool?.name;
	if (!name) return null;
	if (tool && !isAgentTool(tool)) return null;
	if (!tool && !factory) return null;
	return {
		name,
		optional: registration.optional === true,
		tool,
		factory: tool ? () => tool : factory!,
	};
}

function runContextKey(pluginId: string, runId: string | undefined, key: string): string {
	return `${pluginId}:${runId ?? '*'}:${key}`;
}
