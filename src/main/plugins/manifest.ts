import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const CONNECTOR_MANIFEST_FILENAME = 'openclaw.plugin.json';
export const MAX_CONNECTOR_MANIFEST_BYTES = 256 * 1024;

export type ConnectorOrigin = 'bundled' | 'installed' | 'workspace';
export type ConnectorDiagnosticLevel = 'info' | 'warn' | 'error';

export interface ConnectorDiagnostic {
	level: ConnectorDiagnosticLevel;
	code: string;
	message: string;
	pluginId?: string;
	source?: string;
	details?: Record<string, unknown>;
}

export type ConnectorJsonSchema = Record<string, unknown>;
export type ConnectorKind =
	| 'provider'
	| 'tool'
	| 'channel'
	| 'web'
	| 'media'
	| 'speech'
	| 'memory'
	| 'app'
	| 'setup'
	| string;

export type ConnectorActivationCapability = 'provider' | 'channel' | 'tool' | 'hook';

export interface ConnectorManifestActivation {
	onStartup?: boolean;
	onProviders?: string[];
	onAgentHarnesses?: string[];
	onCommands?: string[];
	onChannels?: string[];
	onRoutes?: string[];
	onConfigPaths?: string[];
	onCapabilities?: ConnectorActivationCapability[];
}

export interface ConnectorManifestSetupProvider {
	id: string;
	authMethods?: string[];
	envVars?: string[];
	authEvidence?: unknown[];
}

export interface ConnectorManifestSetup {
	providers?: ConnectorManifestSetupProvider[];
	cliBackends?: string[];
	configMigrations?: string[];
	requiresRuntime?: boolean;
}

export interface ConnectorManifestConfigContracts {
	compatibilityMigrationPaths?: string[];
	compatibilityRuntimePaths?: string[];
	dangerousFlags?: unknown[];
	secretInputs?: unknown;
}

export interface ConnectorManifestContracts {
	tools?: string[];
	webSearchProviders?: string[];
	webFetchProviders?: string[];
	speechProviders?: string[];
	realtimeTranscriptionProviders?: string[];
	realtimeVoiceProviders?: string[];
	memoryEmbeddingProviders?: string[];
	mediaUnderstandingProviders?: string[];
	imageGenerationProviders?: string[];
	videoGenerationProviders?: string[];
	musicGenerationProviders?: string[];
	migrationProviders?: string[];
	agentToolResultMiddleware?: string[];
	embeddedExtensionFactories?: string[];
	externalAuthProviders?: string[];
}

export interface ConnectorManifestToolMetadata {
	optional?: boolean;
	aliases?: string[];
	authProviders?: string[];
	authSignals?: unknown[];
	configSignals?: unknown[];
	[key: string]: unknown;
}

export interface ConnectorProviderAuthChoice {
	provider: string;
	method: string;
	choiceId: string;
	choiceLabel?: string;
	choiceHint?: string;
	assistantPriority?: number;
	assistantVisibility?: 'visible' | 'manual-only';
	deprecatedChoiceIds?: string[];
	groupId?: string;
	groupLabel?: string;
	groupHint?: string;
	onboardingFeatured?: boolean;
	optionKey?: string;
	cliFlag?: string;
	cliOption?: string;
	cliDescription?: string;
	onboardingScopes?: string[];
}

export interface ConnectorCommandAlias {
	name?: string;
	id?: string;
	command?: string;
	cliCommand?: string;
	description?: string;
}

export interface ConnectorManifest {
	id: string;
	name: string;
	description: string;
	kind?: ConnectorKind | ConnectorKind[];
	enabledByDefault?: boolean;
	activation?: ConnectorManifestActivation;
	providers: string[];
	channels: string[];
	providerAuthEnvVars: Record<string, string[]>;
	channelEnvVars: Record<string, string[]>;
	providerAuthChoices: ConnectorProviderAuthChoice[];
	commandAliases: ConnectorCommandAlias[];
	skills: string[];
	uiHints: Record<string, unknown>;
	configSchema: ConnectorJsonSchema;
	configContracts?: ConnectorManifestConfigContracts;
	modelSupport?: unknown;
	modelCatalog?: unknown;
	modelPricing?: unknown;
	providerEndpoints?: unknown[];
	providerRequest?: unknown;
	contracts: ConnectorManifestContracts;
	toolMetadata: Record<string, ConnectorManifestToolMetadata>;
	setup?: ConnectorManifestSetup;
	runtimeEntry?: string;
	setupEntry?: string;
	[key: string]: unknown;
}

export type ConnectorManifestLoadResult =
	| { ok: true; manifest: ConnectorManifest; manifestPath: string; diagnostics: ConnectorDiagnostic[] }
	| { ok: false; manifestPath: string; diagnostics: ConnectorDiagnostic[] };

const EMPTY_CONFIG_SCHEMA: ConnectorJsonSchema = {
	type: 'object',
	properties: {},
	additionalProperties: false,
};

const ACTIVATION_CAPABILITIES = new Set<ConnectorActivationCapability>([
	'provider',
	'channel',
	'tool',
	'hook',
]);

export function loadConnectorManifestFile(manifestPath: string): ConnectorManifestLoadResult {
	const resolved = path.resolve(manifestPath);
	const diagnostics: ConnectorDiagnostic[] = [];
	try {
		const stat = statSync(resolved);
		if (stat.size > MAX_CONNECTOR_MANIFEST_BYTES) {
			diagnostics.push({
				level: 'error',
				code: 'manifest_too_large',
				source: resolved,
				message: `Connector manifest exceeds ${MAX_CONNECTOR_MANIFEST_BYTES} bytes.`,
			});
			return { ok: false, manifestPath: resolved, diagnostics };
		}
		const parsed = JSON.parse(readFileSync(resolved, 'utf8')) as unknown;
		const normalized = normalizeConnectorManifest(parsed, resolved);
		diagnostics.push(...normalized.diagnostics);
		if (!normalized.manifest) return { ok: false, manifestPath: resolved, diagnostics };
		return { ok: true, manifest: normalized.manifest, manifestPath: resolved, diagnostics };
	} catch (error) {
		diagnostics.push({
			level: 'error',
			code: 'manifest_read_failed',
			source: resolved,
			message: error instanceof Error ? error.message : 'Failed to read connector manifest.',
		});
		return { ok: false, manifestPath: resolved, diagnostics };
	}
}

export function normalizeConnectorManifest(
	value: unknown,
	source?: string
): { manifest?: ConnectorManifest; diagnostics: ConnectorDiagnostic[] } {
	const diagnostics: ConnectorDiagnostic[] = [];
	if (!isRecord(value)) {
		diagnostics.push({
			level: 'error',
			code: 'manifest_not_object',
			source,
			message: 'Connector manifest must be a JSON object.',
		});
		return { diagnostics };
	}

	const id = normalizeId(value.id);
	if (!id) {
		diagnostics.push({
			level: 'error',
			code: 'manifest_missing_id',
			source,
			message: 'Connector manifest requires a non-empty id.',
		});
		return { diagnostics };
	}

	const activation = normalizeActivation(value.activation);
	const manifest: ConnectorManifest = {
		...copySafeRecord(value),
		id,
		name: normalizeString(value.name) ?? id,
		description: normalizeString(value.description) ?? '',
		kind: normalizeKind(value.kind),
		enabledByDefault:
			typeof value.enabledByDefault === 'boolean' ? value.enabledByDefault : undefined,
		activation,
		providers: normalizeStringList(value.providers),
		channels: normalizeStringList(value.channels),
		providerAuthEnvVars: normalizeStringListRecord(value.providerAuthEnvVars),
		channelEnvVars: normalizeStringListRecord(value.channelEnvVars),
		providerAuthChoices: normalizeProviderAuthChoices(value.providerAuthChoices),
		commandAliases: normalizeCommandAliases(value.commandAliases),
		skills: normalizeStringList(value.skills),
		uiHints: isRecord(value.uiHints) ? copySafeRecord(value.uiHints) : {},
		configSchema: isRecord(value.configSchema) ? copySafeRecord(value.configSchema) : { ...EMPTY_CONFIG_SCHEMA },
		configContracts: normalizeConfigContracts(value.configContracts),
		modelSupport: value.modelSupport,
		modelCatalog: value.modelCatalog,
		modelPricing: value.modelPricing,
		providerEndpoints: Array.isArray(value.providerEndpoints) ? [...value.providerEndpoints] : undefined,
		providerRequest: value.providerRequest,
		contracts: normalizeContracts(value.contracts),
		toolMetadata: normalizeToolMetadata(value.toolMetadata),
		setup: normalizeSetup(value.setup),
		runtimeEntry: normalizeString(value.runtimeEntry ?? value.entry),
		setupEntry: normalizeString(value.setupEntry),
	};
	return { manifest, diagnostics };
}

export function normalizeConnectorId(value: string): string {
	return value.trim().toLowerCase();
}

export function normalizeConnectorName(value: string): string {
	return value.trim().toLowerCase();
}

export function normalizeManifestToolNames(
	contracts: Pick<ConnectorManifestContracts, 'tools'> | undefined
): string[] {
	return normalizeStringList(contracts?.tools).map(normalizeConnectorName);
}

function normalizeId(value: unknown): string | undefined {
	const normalized = normalizeString(value)?.toLowerCase();
	if (!normalized || !/^[a-z0-9][a-z0-9._-]*$/.test(normalized)) return undefined;
	return normalized;
}

function normalizeString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function normalizeStringList(value: unknown): string[] {
	const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
	const output = new Set<string>();
	for (const entry of raw) {
		const normalized = normalizeString(entry);
		if (normalized) output.add(normalized);
	}
	return [...output];
}

function normalizeKind(value: unknown): ConnectorManifest['kind'] {
	const list = normalizeStringList(value);
	if (list.length > 0) return list.length === 1 ? list[0] : list;
	return undefined;
}

function normalizeStringListRecord(value: unknown): Record<string, string[]> {
	if (!isRecord(value)) return {};
	const output: Record<string, string[]> = {};
	for (const [key, raw] of Object.entries(value)) {
		if (isBlockedObjectKey(key)) continue;
		const normalizedKey = normalizeString(key);
		const values = normalizeStringList(raw);
		if (normalizedKey && values.length > 0) output[normalizedKey] = values;
	}
	return output;
}

function normalizeActivation(value: unknown): ConnectorManifestActivation | undefined {
	if (!isRecord(value)) return undefined;
	const capabilities = normalizeStringList(value.onCapabilities).filter((capability) =>
		ACTIVATION_CAPABILITIES.has(capability as ConnectorActivationCapability)
	) as ConnectorActivationCapability[];
	return compactRecord({
		onStartup: typeof value.onStartup === 'boolean' ? value.onStartup : undefined,
		onProviders: normalizeStringList(value.onProviders),
		onAgentHarnesses: normalizeStringList(value.onAgentHarnesses),
		onCommands: normalizeStringList(value.onCommands),
		onChannels: normalizeStringList(value.onChannels),
		onRoutes: normalizeStringList(value.onRoutes),
		onConfigPaths: normalizeStringList(value.onConfigPaths),
		onCapabilities: capabilities,
	});
}

function normalizeContracts(value: unknown): ConnectorManifestContracts {
	if (!isRecord(value)) return {};
	return compactRecord({
		tools: normalizeStringList(value.tools),
		webSearchProviders: normalizeStringList(value.webSearchProviders),
		webFetchProviders: normalizeStringList(value.webFetchProviders),
		speechProviders: normalizeStringList(value.speechProviders),
		realtimeTranscriptionProviders: normalizeStringList(value.realtimeTranscriptionProviders),
		realtimeVoiceProviders: normalizeStringList(value.realtimeVoiceProviders),
		memoryEmbeddingProviders: normalizeStringList(value.memoryEmbeddingProviders),
		mediaUnderstandingProviders: normalizeStringList(value.mediaUnderstandingProviders),
		imageGenerationProviders: normalizeStringList(value.imageGenerationProviders),
		videoGenerationProviders: normalizeStringList(value.videoGenerationProviders),
		musicGenerationProviders: normalizeStringList(value.musicGenerationProviders),
		migrationProviders: normalizeStringList(value.migrationProviders),
		agentToolResultMiddleware: normalizeStringList(value.agentToolResultMiddleware),
		embeddedExtensionFactories: normalizeStringList(value.embeddedExtensionFactories),
		externalAuthProviders: normalizeStringList(value.externalAuthProviders),
	});
}

function normalizeToolMetadata(value: unknown): Record<string, ConnectorManifestToolMetadata> {
	if (!isRecord(value)) return {};
	const output: Record<string, ConnectorManifestToolMetadata> = {};
	for (const [name, metadata] of Object.entries(value)) {
		if (isBlockedObjectKey(name) || !isRecord(metadata)) continue;
		const normalizedName = normalizeString(name);
		if (!normalizedName) continue;
		output[normalizedName] = {
			...copySafeRecord(metadata),
			optional: typeof metadata.optional === 'boolean' ? metadata.optional : undefined,
			aliases: normalizeStringList(metadata.aliases),
			authProviders: normalizeStringList(metadata.authProviders),
		};
	}
	return output;
}

function normalizeProviderAuthChoices(value: unknown): ConnectorProviderAuthChoice[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		if (!isRecord(entry)) return [];
		const provider = normalizeString(entry.provider);
		const method = normalizeString(entry.method);
		const choiceId = normalizeString(entry.choiceId);
		if (!provider || !method || !choiceId) return [];
		const assistantVisibility =
			entry.assistantVisibility === 'manual-only' || entry.assistantVisibility === 'visible'
				? entry.assistantVisibility
				: undefined;
		return [
			compactRecord<ConnectorProviderAuthChoice>({
				provider,
				method,
				choiceId,
				choiceLabel: normalizeString(entry.choiceLabel),
				choiceHint: normalizeString(entry.choiceHint),
				assistantPriority:
					typeof entry.assistantPriority === 'number' ? entry.assistantPriority : undefined,
				assistantVisibility,
				deprecatedChoiceIds: normalizeStringList(entry.deprecatedChoiceIds),
				groupId: normalizeString(entry.groupId),
				groupLabel: normalizeString(entry.groupLabel),
				groupHint: normalizeString(entry.groupHint),
				onboardingFeatured:
					typeof entry.onboardingFeatured === 'boolean' ? entry.onboardingFeatured : undefined,
				optionKey: normalizeString(entry.optionKey),
				cliFlag: normalizeString(entry.cliFlag),
				cliOption: normalizeString(entry.cliOption),
				cliDescription: normalizeString(entry.cliDescription),
				onboardingScopes: normalizeStringList(entry.onboardingScopes),
			}),
		];
	});
}

function normalizeCommandAliases(value: unknown): ConnectorCommandAlias[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		if (typeof entry === 'string') {
			const name = normalizeString(entry);
			return name ? ([{ name }] satisfies ConnectorCommandAlias[]) : [];
		}
		if (!isRecord(entry)) return [];
		const alias = compactRecord<ConnectorCommandAlias>({
			name: normalizeString(entry.name),
			id: normalizeString(entry.id),
			command: normalizeString(entry.command),
			cliCommand: normalizeString(entry.cliCommand),
			description: normalizeString(entry.description),
		});
		return Object.keys(alias).length > 0 ? [alias] : [];
	});
}

function normalizeSetup(value: unknown): ConnectorManifestSetup | undefined {
	if (!isRecord(value)) return undefined;
	const providers = Array.isArray(value.providers)
		? value.providers.flatMap((entry) => {
				if (!isRecord(entry)) return [];
				const id = normalizeString(entry.id);
				if (!id) return [];
				return [
					compactRecord({
						id,
						authMethods: normalizeStringList(entry.authMethods),
						envVars: normalizeStringList(entry.envVars),
						authEvidence: Array.isArray(entry.authEvidence) ? [...entry.authEvidence] : undefined,
					}),
				];
			})
		: [];
	return compactRecord({
		providers,
		cliBackends: normalizeStringList(value.cliBackends),
		configMigrations: normalizeStringList(value.configMigrations),
		requiresRuntime: typeof value.requiresRuntime === 'boolean' ? value.requiresRuntime : undefined,
	});
}

function normalizeConfigContracts(value: unknown): ConnectorManifestConfigContracts | undefined {
	if (!isRecord(value)) return undefined;
	return compactRecord({
		compatibilityMigrationPaths: normalizeStringList(value.compatibilityMigrationPaths),
		compatibilityRuntimePaths: normalizeStringList(value.compatibilityRuntimePaths),
		dangerousFlags: Array.isArray(value.dangerousFlags) ? [...value.dangerousFlags] : undefined,
		secretInputs: value.secretInputs,
	});
}

function compactRecord<T extends object>(value: T): T {
	const output: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
		if (entry === undefined) continue;
		if (Array.isArray(entry) && entry.length === 0) continue;
		output[key] = entry;
	}
	return output as T;
}

function copySafeRecord(value: Record<string, unknown>): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (!isBlockedObjectKey(key)) output[key] = entry;
	}
	return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBlockedObjectKey(key: string): boolean {
	return key === '__proto__' || key === 'prototype' || key === 'constructor';
}
