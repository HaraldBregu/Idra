import { randomUUID } from 'node:crypto';
import { shell } from 'electron';
import Store from 'electron-store';
import type { LoggerService } from '../logger';
import type { JSONSchema, ToolResultBlock } from '../provider/types';
import { resolveDefaultAppDataPath } from '../agent/storage';
import { CONNECTOR_TOOL_PERMISSIONS, DEFAULT_CONNECTOR_TOOL_PERMISSION } from '../../shared/connector';
import defaultConnectorCatalog from '../../shared/connector/catalog.json';
import type {
	ConnectorCallToolOptions,
	ConnectorCatalogEntry,
	ConnectorConfig,
	ConnectorInput,
	ConnectorMcpConfig,
	ConnectorMcpEnvSecret,
	ConnectorMcpHeaderSecret,
	ConnectorOAuthAuthorizeResult,
	ConnectorProviderId,
	ConnectorStatus,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorToolPermission,
	ConnectorView,
} from '../../shared/connector';
import {
	createSdkConnectorMcpClient,
	missingMcpSecretNames,
	type ConnectorMcpClient,
	type ConnectorMcpClientFactory,
} from './mcp-client';

const CONNECTOR_STORE_NAME = 'connectors';
const CONNECTOR_STORE_KEY = 'connectors';
const CONNECTOR_TOOLS_STORE_KEY = 'tools';
const CONNECTORS_LOG_SOURCE = 'ConnectorsService';
const SERVER_LABEL_PATTERN = /^[a-zA-Z0-9_-]+$/;
const CONNECTOR_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SECRET_HEADER_NAMES = new Set(['authorization', 'x-api-key', 'api-key']);

interface ConnectorPersistenceStore {
	get(key: string): unknown;
	set(key: string, value: ConnectorConfig[]): void;
	delete(key: string): void;
}

interface ConnectorToolPersistenceStore {
	get(key: string): unknown;
	set(key: string, value: Record<string, ConnectorTool[]>): void;
	delete(key: string): void;
}

type ConnectorCatalogProvider =
	| readonly ConnectorCatalogEntry[]
	| (() => readonly ConnectorCatalogEntry[] | Promise<readonly ConnectorCatalogEntry[]>);

interface ToolContext {
	sessionId?: string;
}

interface AgentToolResult<TDetails = unknown> {
	status: 'ok' | 'error' | 'blocked';
	content: ToolResultBlock[];
	details?: TDetails;
}

interface AgentTool<TArgs = Record<string, unknown>, TDetails = unknown> {
	name: string;
	displayName?: string;
	displaySummary?: string;
	description: string;
	schema: JSONSchema;
	serviceKind?: 'tool' | 'connector' | 'mcp';
	serviceId?: string;
	ownerOnly?: boolean;
	needsApproval?: boolean | ((args: TArgs, ctx: ToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

interface ConnectorsServiceOptions {
	store?: ConnectorPersistenceStore;
	toolStore?: ConnectorToolPersistenceStore;
	catalogProvider?: ConnectorCatalogProvider;
	mcpClientFactory?: ConnectorMcpClientFactory;
	openExternalUrl?: (url: string) => Promise<void>;
	env?: NodeJS.ProcessEnv;
}

function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}

function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function statusFor(connector: ConnectorConfig): ConnectorStatus {
	if (!connector.enabled) return 'disabled';
	if (connector.oauth) return connector.oauth.token ? 'configured' : 'missing_auth';
	if (!connector.mcp) return 'missing_auth';
	if (missingMcpSecretNames(connector).length > 0) return 'missing_auth';
	if (connector.lastError) return 'error';
	return 'configured';
}

function toView(connector: ConnectorConfig): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		authKind: connector.oauth ? 'oauth' : 'mcp_env',
		serverLabel: connector.serverLabel,
		enabled: connector.enabled,
		status: statusFor(connector),
		requireApproval: connector.requireApproval,
		allowedToolsCount: connector.allowedTools.length,
		toolsCount: connector.tools.length,
		deferLoading: connector.deferLoading,
		lastRefreshedAt: connector.lastRefreshedAt,
		lastError: connector.lastError,
		connectedAccount: connector.oauth?.accountEmail,
	};
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(label + ' is required.');
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function readOptionalString(params: Record<string, unknown>, key: string): string | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(key + ' must be a string.');
	return value;
}

function readRequiredString(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(label + ' must be a string.');
	const trimmed = value.trim();
	if (!trimmed) throw new Error(label + ' is required.');
	return trimmed;
}

function readOptionalBoolean(params: Record<string, unknown>, key: string): boolean | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'boolean') throw new Error(key + ' must be a boolean.');
	return value;
}

function readConnectorToolArguments(args: unknown): Record<string, unknown> {
	if (args === undefined || args === null) return {};
	if (typeof args !== 'object' || Array.isArray(args)) {
		throw new Error('Connector tool arguments must be an object.');
	}
	return args as Record<string, unknown>;
}

function readConnectorCallToolOptions(options: unknown): ConnectorCallToolOptions | undefined {
	if (options === undefined || options === null) return undefined;
	if (typeof options !== 'object' || Array.isArray(options)) {
		throw new Error('Connector tool options must be an object.');
	}
	const raw = options as { timeoutMs?: unknown; retries?: unknown };
	const timeoutMs = raw.timeoutMs;
	if (timeoutMs !== undefined) {
		if (typeof timeoutMs !== 'number' || !Number.isInteger(timeoutMs) || timeoutMs < 0) {
			throw new Error('Connector tool option timeoutMs must be a non-negative integer.');
		}
	}
	const retries = raw.retries;
	if (retries !== undefined) {
		if (typeof retries !== 'number' || !Number.isInteger(retries) || retries < 0) {
			throw new Error('Connector tool option retries must be a non-negative integer.');
		}
	}
	return {
		timeoutMs: timeoutMs as number | undefined,
		retries: retries as number | undefined,
	};
}

function readOptionalStringArray(params: Record<string, unknown>, key: string): string[] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error(key + ' must be an array of strings.');
	}
	return value.map((entry) => entry.trim()).filter(Boolean);
}

function readOptionalApprovalMode(
	params: Record<string, unknown>,
	key: string
): ConnectorInput['requireApproval'] | undefined {
	const value = readOptionalString(params, key);
	if (value === undefined) return undefined;
	if (value === 'always' || value === 'never' || value === 'never_for_allowed_tools') return value;
	throw new Error(key + ' must be one of: always, never, never_for_allowed_tools.');
}

function sanitizeInput(input: unknown, current?: ConnectorConfig): ConnectorInput {
	const raw = requireObject(input, current ? 'Connector update' : 'Connector configuration');
	const name = readOptionalString(raw, 'name')?.trim() ?? current?.name ?? '';
	const connectorId = readOptionalString(raw, 'connectorId')?.trim() ?? current?.connectorId ?? '';
	const serverLabel = readOptionalString(raw, 'serverLabel')?.trim() || current?.serverLabel || serverLabelFromName(name);
	const serverDescription = readOptionalString(raw, 'serverDescription')?.trim() || current?.serverDescription;
	const authorization = readOptionalString(raw, 'authorization')?.trim();
	const requireApproval = readOptionalApprovalMode(raw, 'requireApproval') ?? current?.requireApproval ?? 'always';
	const allowedTools = readOptionalStringArray(raw, 'allowedTools') ?? current?.allowedTools ?? [];
	const deferLoading = readOptionalBoolean(raw, 'deferLoading') ?? current?.deferLoading ?? false;
	const enabled = readOptionalBoolean(raw, 'enabled') ?? current?.enabled ?? true;
	const mcp = sanitizeMcpConfig(raw.mcp, current?.mcp);

	if (!name) throw new Error('Connector name is required.');
	assertConnectorId(connectorId);
	if (!serverLabel) throw new Error('Server label is required.');
	if (!SERVER_LABEL_PATTERN.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}
	if (authorization) {
		throw new Error('Connector secrets must be stored in environment variables and referenced from MCP config.');
	}
	if (!mcp) throw new Error('MCP transport configuration is required.');

	return {
		name,
		connectorId,
		serverLabel,
		serverDescription,
		authorization: '',
		requireApproval,
		allowedTools: Array.from(new Set(allowedTools)),
		deferLoading,
		enabled,
		mcp,
	};
}

function sanitizeMcpConfig(value: unknown, current?: ConnectorMcpConfig): ConnectorMcpConfig | undefined {
	if (value === undefined || value === null) return current;
	const raw = requireObject(value, 'MCP configuration');
	const transport = readOptionalString(raw, 'transport')?.trim();
	if (transport === 'http') return sanitizeHttpMcpConfig(raw, current?.transport === 'http' ? current : undefined);
	if (transport === 'stdio') return sanitizeStdioMcpConfig(raw, current?.transport === 'stdio' ? current : undefined);
	throw new Error('MCP transport must be one of: http, stdio.');
}

function sanitizeHttpMcpConfig(
	raw: Record<string, unknown>,
	current?: Extract<ConnectorMcpConfig, { transport: 'http' }>
): ConnectorMcpConfig {
	const url = readOptionalString(raw, 'url')?.trim() ?? current?.url ?? '';
	if (!url) throw new Error('MCP HTTP url is required.');
	const parsedUrl = new URL(url);
	if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
		throw new Error('MCP HTTP url must use http or https.');
	}
	const method = readOptionalString(raw, 'method')?.trim().toUpperCase() || current?.method;
	if (method && method !== 'POST') throw new Error('MCP HTTP method must be POST.');
	return {
		transport: 'http',
		url: parsedUrl.toString(),
		method: method as 'POST' | undefined,
		headers: sanitizeHeaderRecord(raw.headers, current?.headers),
		sessionId: readOptionalString(raw, 'sessionId')?.trim() || current?.sessionId,
		auth: sanitizeHeaderSecret(raw.auth, current?.auth),
	};
}

function sanitizeStdioMcpConfig(
	raw: Record<string, unknown>,
	current?: Extract<ConnectorMcpConfig, { transport: 'stdio' }>
): ConnectorMcpConfig {
	const command = readOptionalString(raw, 'command')?.trim() ?? current?.command ?? '';
	if (!command) throw new Error('MCP stdio command is required.');
	return {
		transport: 'stdio',
		command,
		args: readOptionalStringArray(raw, 'args') ?? current?.args,
		cwd: readOptionalString(raw, 'cwd')?.trim() || current?.cwd,
		env: sanitizeEnvRecord(raw.env, current?.env),
		envSecrets: sanitizeEnvSecrets(raw.envSecrets, current?.envSecrets),
	};
}

function sanitizeHeaderRecord(value: unknown, current?: Record<string, string>): Record<string, string> | undefined {
	if (value === undefined || value === null) return current;
	const raw = requireObject(value, 'MCP headers');
	const headers: Record<string, string> = {};
	for (const [key, entry] of Object.entries(raw)) {
		if (typeof entry !== 'string') throw new Error('MCP header values must be strings.');
		const header = key.trim();
		if (!header) continue;
		if (SECRET_HEADER_NAMES.has(header.toLowerCase())) {
			throw new Error('MCP secret headers must be configured with an environment variable auth reference.');
		}
		headers[header] = entry;
	}
	return Object.keys(headers).length > 0 ? headers : undefined;
}

function sanitizeEnvRecord(value: unknown, current?: Record<string, string>): Record<string, string> | undefined {
	if (value === undefined || value === null) return current;
	const raw = requireObject(value, 'MCP env');
	const env: Record<string, string> = {};
	for (const [key, entry] of Object.entries(raw)) {
		if (typeof entry !== 'string') throw new Error('MCP env values must be strings.');
		const name = key.trim();
		if (!name) continue;
		assertEnvName(name, 'MCP env name');
		env[name] = entry;
	}
	return Object.keys(env).length > 0 ? env : undefined;
}

function sanitizeHeaderSecret(value: unknown, current?: ConnectorMcpHeaderSecret): ConnectorMcpHeaderSecret | undefined {
	if (value === undefined || value === null) return current;
	const raw = requireObject(value, 'MCP auth');
	const env = readRequiredString(raw.env, 'MCP auth env');
	assertEnvName(env, 'MCP auth env');
	const header = readOptionalString(raw, 'header')?.trim();
	const scheme = readOptionalString(raw, 'scheme')?.trim() ?? current?.scheme ?? 'bearer';
	if (scheme !== 'bearer' && scheme !== 'raw') throw new Error('MCP auth scheme must be bearer or raw.');
	return {
		env,
		header: header || current?.header,
		scheme,
	};
}

function sanitizeEnvSecrets(value: unknown, current?: ConnectorMcpEnvSecret[]): ConnectorMcpEnvSecret[] | undefined {
	if (value === undefined || value === null) return current;
	if (!Array.isArray(value)) throw new Error('MCP envSecrets must be an array.');
	const secrets = value.map((entry) => {
		const raw = requireObject(entry, 'MCP env secret');
		const env = readRequiredString(raw.env, 'MCP env secret source');
		const target = readRequiredString(raw.target, 'MCP env secret target');
		assertEnvName(env, 'MCP env secret source');
		assertEnvName(target, 'MCP env secret target');
		return { env, target };
	});
	return secrets.length > 0 ? secrets : undefined;
}

function assertConnectorId(value: string): void {
	if (!value) throw new Error('Connector id is required.');
	if (!CONNECTOR_ID_PATTERN.test(value)) {
		throw new Error('Connector id can contain only letters, numbers, dots, colons, underscores, and hyphens.');
	}
}

function assertEnvName(value: string, label: string): void {
	if (!ENV_NAME_PATTERN.test(value)) throw new Error(label + ' must be a valid environment variable name.');
}

export class ConnectorsService {
	private readonly store: ConnectorPersistenceStore;
	private readonly toolStore?: ConnectorToolPersistenceStore;
	private readonly clients = new Map<string, ConnectorMcpClient>();

	constructor(
		private readonly logger: LoggerService,
		private readonly options: ConnectorsServiceOptions = {}
	) {
		this.store =
			options.store ??
			(new Store<Record<string, ConnectorConfig[]>>({
				name: CONNECTOR_STORE_NAME,
				cwd: resolveDefaultAppDataPath(),
				accessPropertiesByDotNotation: false,
			}) as ConnectorPersistenceStore);
		this.toolStore = options.toolStore;
	}

	async catalog(): Promise<ConnectorCatalogEntry[]> {
		return mergeCatalogEntries([
			...(await this.catalogEntriesFromProvider()),
			...this.validConnectors()
				.filter((connector) => !connector.oauth)
				.map((connector) => this.catalogEntryFromConnector(connector)),
		]);
	}

	list(): ConnectorView[] {
		return this.validConnectors().map(toView);
	}

	getConnectorSettings(): ConnectorConfig[] {
		return this.validConnectors().map(redactConnectorSecrets);
	}

	get(id: string): ConnectorConfig {
		return redactConnectorSecrets(this.getStored(id));
	}

	async authorizeOAuth(input: unknown): Promise<ConnectorOAuthAuthorizeResult> {
		const connectorId = readRequiredString(
			requireObject(input, 'OAuth authorization request').connectorId,
			'Connector id'
		);
		const definition = await this.oauthCatalogEntry(connectorId);
		if (!definition?.oauth) throw new Error('OAuth connector not found: ' + connectorId);

		const clientIdEnv = definition.oauth.clientIdEnv;
		const clientId = this.options.env?.[clientIdEnv] ?? process.env[clientIdEnv];
		if (!clientId?.trim()) throw new Error('Missing OAuth client id environment variable: ' + clientIdEnv);

		const state = randomUUID();
		const authorizationUrl = oauthAuthorizationUrl(definition, clientId.trim(), state);
		const now = new Date().toISOString();
		const existing = this.validConnectors().find((connector) => connector.connectorId === definition.id);
		const requireApproval = existing?.requireApproval ?? 'always';
		const allowedTools = existing?.allowedTools ?? [];
		const connector: ConnectorConfig = {
			id: existing?.id ?? randomUUID(),
			name: existing?.name ?? definition.name,
			connectorId: definition.id,
			serverLabel: existing?.serverLabel ?? serverLabelFromName(definition.name),
			serverDescription: existing?.serverDescription,
			enabled: true,
			authorization: '',
			requireApproval,
			allowedTools,
			deferLoading: existing?.deferLoading ?? false,
			tools: normalizeConnectorTools(existing?.tools ?? [], DEFAULT_CONNECTOR_TOOL_PERMISSION),
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
			mcp: existing?.mcp ?? definition.mcp,
			oauth: {
				providerId: definition.oauth.providerId,
				authorizationUrl,
				clientId: clientId.trim(),
				redirectUri: definition.oauth.redirectUri,
				scopes: definition.scopes,
				state,
				accountEmail: existing?.oauth?.accountEmail,
				token: existing?.oauth?.token,
			},
		};
		const next = await this.withOAuthTools(connector);

		this.replace(next);
		await (this.options.openExternalUrl ?? shell.openExternal)(authorizationUrl);

		return {
			connectorId: definition.id,
			authorizationUrl,
			connector: redactConnectorSecrets(next),
		};
	}

	completeOAuth(input: unknown): ConnectorConfig {
		const raw = requireObject(input, 'OAuth completion');
		const state = readRequiredString(raw.state, 'OAuth state');
		const accessToken = readRequiredString(raw.accessToken, 'OAuth access token');
		const refreshToken = readOptionalString(raw, 'refreshToken')?.trim();
		const tokenType = readOptionalString(raw, 'tokenType')?.trim();
		const scope = readOptionalString(raw, 'scope')?.trim();
		const accountEmail = readOptionalString(raw, 'accountEmail')?.trim();
		const expiresIn = raw.expiresIn;
		if (expiresIn !== undefined && (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn < 0)) {
			throw new Error('OAuth expiresIn must be a non-negative number.');
		}

		const current = this.validConnectors().find((connector) => connector.oauth?.state === state);
		if (!current?.oauth) throw new Error('OAuth connector not found for state: ' + state);
		const next: ConnectorConfig = {
			...current,
			updatedAt: new Date().toISOString(),
			oauth: {
				...current.oauth,
				accountEmail: accountEmail || current.oauth.accountEmail,
				token: {
					accessToken,
					refreshToken,
					tokenType,
					scope,
					expiresAt: typeof expiresIn === 'number'
						? new Date(Date.now() + expiresIn * 1000).toISOString()
						: undefined,
				},
			},
		};
		this.replace(next);
		return redactConnectorSecrets(next);
	}

	restoreEnabledConnectors(): void {
		this.writeAll(this.validConnectors());
	}

	async add(input: unknown): Promise<ConnectorConfig> {
		const sanitized = this.validateConnectorInput('add', () => sanitizeInput(input));
		const now = new Date().toISOString();
		const connector: ConnectorConfig = {
			id: randomUUID(),
			name: sanitized.name,
			connectorId: sanitized.connectorId,
			serverLabel: sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
			serverDescription: sanitized.serverDescription,
			authorization: '',
			requireApproval: sanitized.requireApproval ?? 'always',
			allowedTools: sanitized.allowedTools ?? [],
			deferLoading: sanitized.deferLoading ?? false,
			tools: [],
			createdAt: now,
			updatedAt: now,
			enabled: sanitized.enabled ?? true,
			mcp: sanitized.mcp,
		};
		const next = await this.refreshConnectorToolsIfConfigured(connector);
		this.writeConnector(next);
		return redactConnectorSecrets(next);
	}

	async update(id: string, input: unknown): Promise<ConnectorConfig> {
		const current = this.getStored(id);
		const sanitized = this.validateConnectorInput('update', () => sanitizeInput(input, current));
		const next = await this.refreshConnectorToolsIfConfigured({
			...current,
			...sanitized,
			authorization: '',
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		});
		this.replace(next);
		return redactConnectorSecrets(next);
	}

	async remove(id: string): Promise<void> {
		const connectors = this.validConnectors();
		const connector = connectors.find((item) => item.id === id);
		if (!connector) {
			this.logDebug('Skipped connector delete because it was not configured', { id });
			return;
		}
		await this.closeClient(connector.id);
		this.writeAll(connectors.filter((item) => item.id !== id));
		this.logDebug('Deleted connector settings', { id, connectorId: connector.connectorId });
	}

	async enable(id: string): Promise<ConnectorConfig> {
		return this.update(id, { enabled: true });
	}

	async disable(id: string): Promise<ConnectorConfig> {
		return this.update(id, { enabled: false });
	}

	async test(id: string): Promise<ConnectorTestResult> {
		const connector = this.getStored(id);
		const status = statusFor(connector);
		if (status === 'disabled') return { status, message: 'Connector is disabled.' };
		if (status === 'missing_auth') {
			return {
				status,
				message: missingSecretMessage(connector) ?? 'MCP connector configuration is incomplete.',
			};
		}
		if (connector.oauth) {
			return { status: 'configured', message: 'OAuth connector is configured with ' + connector.tools.length + ' tools.' };
		}
		try {
			const tools = await this.refreshTools(id);
			return { status: 'configured', message: 'MCP server is reachable with ' + tools.length + ' tools.' };
		} catch (error) {
			return { status: 'error', message: this.errorMessage(error) };
		}
	}

	async reconnect(id: string): Promise<ConnectorTestResult> {
		return this.test(id);
	}


	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.getStored(id);
		if (connector.oauth) {
			const next = await this.withOAuthTools(connector);
			this.replace(next);
			return next.tools;
		}
		const missing = missingMcpSecretNames(connector);
		if (missing.length > 0) throw new Error('Missing MCP secret environment variable: ' + missing.join(', '));
		const next = await this.withDiscoveredTools(connector);
		this.replace(next);
		return next.tools;
	}

	listTools(id: string): ConnectorTool[] {
		const connector = this.getStored(id);
		return connector.tools;
	}

	async callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		const connectorId = readRequiredString(id, 'Connector id');
		const toolName = readRequiredString(name, 'Connector tool name');
		const callOptions = readConnectorCallToolOptions(options);
		const nextArgs = readConnectorToolArguments(args);
		const connector = this.getStored(connectorId);
		const tool = connector.tools.find((item) => item.name === toolName);
		if (statusFor(connector) !== 'configured') throw new Error('Connector is not configured: ' + connector.name);
		if (!tool) {
			throw new Error('Tool ' + toolName + ' is not enabled for ' + connector.name + '.');
		}
		if (tool.permission === 'blocked') throw new Error('Tool ' + toolName + ' is blocked for ' + connector.name + '.');
		return this.clientFor(connector).callTool(toolName, nextArgs, callOptions);
	}

	async listResources(id: unknown, options?: unknown): Promise<unknown> {
		const connector = this.requireConfiguredConnector(id);
		return this.clientFor(connector).listResources(readConnectorCallToolOptions(options));
	}

	async readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown> {
		const connector = this.requireConfiguredConnector(id);
		const resourceUri = readRequiredString(uri, 'MCP resource URI');
		return this.clientFor(connector).readResource(
			resourceUri,
			readConnectorCallToolOptions(options)
		);
	}

	async listPrompts(id: unknown, options?: unknown): Promise<unknown> {
		const connector = this.requireConfiguredConnector(id);
		return this.clientFor(connector).listPrompts(readConnectorCallToolOptions(options));
	}

	async getPrompt(
		id: unknown,
		name: unknown,
		args?: unknown,
		options?: unknown
	): Promise<unknown> {
		const connector = this.requireConfiguredConnector(id);
		const promptName = readRequiredString(name, 'MCP prompt name');
		return this.clientFor(connector).getPrompt(
			promptName,
			readConnectorToolArguments(args),
			readConnectorCallToolOptions(options)
		);
	}

	createAgentTools(): AgentTool[] {
		return this.validConnectors()
			.filter((connector) => connector.enabled && statusFor(connector) === 'configured')
			.flatMap((connector) =>
				connector.tools.filter((tool) => tool.permission !== 'blocked').map((tool) => {
					const rawToolName = tool.name;
					return {
						name: agentToolNameFor(connector, rawToolName),
						displayName: connector.name + ': ' + rawToolName,
						description: connector.name + ': ' + (tool.description ?? 'Run ' + rawToolName + '.'),
						schema: schemaForTool(tool),
						serviceKind: 'connector',
						serviceId: connector.id,
						needsApproval: tool.permission === 'needs-approval' ? () => true : false,
						execute: async (toolArgs: unknown) => {
							try {
								const payload = await this.callTool(connector.id, rawToolName, toolArgs);
								return textResult(JSON.stringify(payload, null, 2));
							} catch (error) {
								return textResult(error instanceof Error ? error.message : String(error), true);
							}
						},
					} satisfies AgentTool;
				})
			);
	}

	async close(): Promise<void> {
		await Promise.all([...this.clients.keys()].map((id) => this.closeClient(id)));
	}

	private async refreshConnectorToolsIfConfigured(connector: ConnectorConfig): Promise<ConnectorConfig> {
		if (connector.oauth) {
			return this.withOAuthTools(connector);
		}
		if (!connector.mcp) {
			return connector;
		}
		if (!connector.enabled || missingMcpSecretNames(connector).length > 0) {
			return connector;
		}
		try {
			return await this.withDiscoveredTools(connector);
		} catch (error) {
			return { ...connector, tools: [], lastError: this.errorMessage(error) };
		}
	}

	private async withOAuthTools(connector: ConnectorConfig): Promise<ConnectorConfig> {
		if (!connector.mcp) return connector;
		try {
			return await this.withDiscoveredTools(connector, DEFAULT_CONNECTOR_TOOL_PERMISSION);
		} catch (error) {
			return { ...connector, lastError: this.errorMessage(error) };
		}
	}

	private async withDiscoveredTools(
		connector: ConnectorConfig,
		defaultPermission?: ConnectorToolPermission
	): Promise<ConnectorConfig> {
		const tools = this.applyToolPolicy(connector, await this.clientFor(connector).listTools(), defaultPermission);
		return {
			...connector,
			tools,
			lastRefreshedAt: new Date().toISOString(),
			lastError: undefined,
		};
	}

	private applyToolPolicy(
		connector: ConnectorConfig,
		tools: readonly ConnectorTool[],
		defaultPermission?: ConnectorToolPermission
	): ConnectorTool[] {
		return tools.map((tool) => {
			const permission = defaultPermission ?? permissionForTool(connector, tool.name);
			return { ...normalizeConnectorTool(tool, permission), permission, requiresApproval: permission === 'needs-approval' };
		});
	}

	private clientFor(connector: ConnectorConfig): ConnectorMcpClient {
		const existing = this.clients.get(connector.id);
		if (existing) return existing;
		const client = this.options.mcpClientFactory?.(connector) ?? createSdkConnectorMcpClient(connector);
		this.clients.set(connector.id, client);
		return client;
	}

	private requireConfiguredConnector(id: unknown): ConnectorConfig {
		const connectorId = readRequiredString(id, 'Connector id');
		const connector = this.getStored(connectorId);
		if (statusFor(connector) !== 'configured') throw new Error('Connector is not configured: ' + connector.name);
		return connector;
	}

	private getStored(id: string): ConnectorConfig {
		const connector = this.validConnectors().find((item) => item.id === id);
		if (!connector) throw new Error('Connector not found: ' + id);
		return connector;
	}

	private validConnectors(): ConnectorConfig[] {
		return this.readStoredConnectors()
			.map((connector) => {
				if (connector.tools.length > 0) return connector;
				const legacyTools = this.readLegacyTools(connector.id);
				return legacyTools.length > 0 ? { ...connector, tools: legacyTools } : connector;
			});
	}

	private replace(connector: ConnectorConfig): void {
		void this.closeClient(connector.id);
		const connectors = this.validConnectors();
		const next = connectors.some((item) => item.id === connector.id)
			? connectors.map((item) => (item.id === connector.id ? connector : item))
			: [...connectors, connector];
		this.writeAll(next);
		this.logDebug('Updated connector ' + connector.name, { connectorId: connector.connectorId });
	}

	private readStoredConnectors(): ConnectorConfig[] {
		this.logDebug('Read connector settings');
		const raw = this.readConnectorStore();
		if (raw === undefined) return [];
		if (!Array.isArray(raw)) {
			this.logWarn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY, reason: 'not_array' });
			return [];
		}
		return raw.flatMap((entry, index) => {
			const record = readRecord(entry);
			if (!record) {
				this.logWarn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY, index, reason: 'not_object' });
				return [];
			}
			const connector = record as unknown as ConnectorConfig;
			if (!isStoredConnectorValid(connector)) {
				this.logWarn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY, index, connectorId: record.connectorId });
				return [];
			}
			try {
				return [normalizeStoredConnector(connector)];
			} catch (error) {
				this.logError('Failed to normalize connector settings', { key: CONNECTOR_STORE_KEY, index, error: this.errorMessage(error) });
				return [];
			}
		});
	}

	private readConnectorStore(): unknown {
		try {
			return this.store.get(CONNECTOR_STORE_KEY);
		} catch (error) {
			this.logError('Failed to read connector settings', { key: CONNECTOR_STORE_KEY, error: this.errorMessage(error) });
			throw error;
		}
	}

	private writeConnector(connector: ConnectorConfig): void {
		this.writeAll([...this.validConnectors(), connector]);
	}

	private writeAll(connectors: ConnectorConfig[]): void {
		try {
			this.store.set(CONNECTOR_STORE_KEY, connectors.map(normalizeStoredConnector));
			this.logDebug('Wrote connector settings', { key: CONNECTOR_STORE_KEY, count: connectors.length });
		} catch (error) {
			this.logError('Failed to write connector settings', { key: CONNECTOR_STORE_KEY, error: this.errorMessage(error) });
			throw error;
		}
	}

	private readLegacyTools(connectorId: string): ConnectorTool[] {
		const raw = this.readLegacyToolRecords()[connectorId];
		if (!Array.isArray(raw)) return [];
		return raw.flatMap((tool) => isConnectorToolRecord(tool) ? [normalizeConnectorTool(tool)] : []);
	}

	private readLegacyToolRecords(): Record<string, ConnectorTool[]> {
		if (!this.toolStore) return {};
		try {
			const raw = this.toolStore.get(CONNECTOR_TOOLS_STORE_KEY);
			if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
			return { ...(raw as Record<string, ConnectorTool[]>) };
		} catch (error) {
			this.logError('Failed to read connector tool cache', { key: CONNECTOR_TOOLS_STORE_KEY, error: this.errorMessage(error) });
			throw error;
		}
	}

	private async catalogEntriesFromProvider(): Promise<ConnectorCatalogEntry[]> {
		const provider = this.options.catalogProvider;
		const entries = typeof provider === 'function'
			? await provider()
			: (provider ?? defaultConnectorCatalog) as ConnectorCatalogEntry[];
		return entries.map(normalizeCatalogEntry);
	}

	private async oauthCatalogEntry(id: string): Promise<ConnectorCatalogEntry | undefined> {
		return (await this.catalogEntriesFromProvider()).find((entry) => entry.id === id && entry.oauth);
	}

	private catalogEntryFromConnector(connector: ConnectorConfig): ConnectorCatalogEntry {
		return normalizeCatalogEntry({
			id: connector.connectorId,
			name: connector.name,
			description: connector.serverDescription ?? connector.name,
			environmentSecretNames: environmentSecretNamesFor(connector.mcp),
			platformDocumentationPages: [],
			tools: connector.tools.map((tool) => tool.name),
			scopes: [],
			setupInstructions: [],
			authKind: 'mcp_env',
			runtimeKind: 'mcp',
			allowMultipleInstances: true,
		});
	}

	private validateConnectorInput<T>(action: 'add' | 'update', run: () => T): T {
		try {
			return run();
		} catch (error) {
			this.logWarn('Connector validation failed', { action, error: this.errorMessage(error) });
			throw error;
		}
	}

	private async closeClient(id: string): Promise<void> {
		const client = this.clients.get(id);
		if (!client) return;
		this.clients.delete(id);
		await client.close();
	}

	private logDebug(message: string, data?: unknown): void {
		this.logger.debug(CONNECTORS_LOG_SOURCE, message, data);
	}

	private logWarn(message: string, data?: unknown): void {
		this.logger.warn(CONNECTORS_LOG_SOURCE, message, data);
	}

	private logError(message: string, data?: unknown): void {
		this.logger.error(CONNECTORS_LOG_SOURCE, message, data);
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}

function isStoredConnectorValid(connector: ConnectorConfig): boolean {
	return (
		typeof connector.id === 'string' &&
		typeof connector.name === 'string' &&
		typeof connector.connectorId === 'string' &&
		CONNECTOR_ID_PATTERN.test(connector.connectorId) &&
		(connector.mcp !== undefined || connector.oauth !== undefined)
	);
}

function normalizeStoredConnector(connector: ConnectorConfig): ConnectorConfig {
	return {
		...connector,
		authorization: '',
		allowedTools: Array.isArray(connector.allowedTools) ? connector.allowedTools : [],
		tools: Array.isArray(connector.tools)
			? connector.tools.flatMap((tool) => isConnectorToolRecord(tool) ? [normalizeConnectorTool(tool)] : [])
			: [],
	};
}

function isConnectorToolRecord(value: unknown): value is ConnectorTool {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value) && typeof (value as ConnectorTool).name === 'string');
}

function normalizeConnectorTools(
	tools: readonly ConnectorTool[],
	fallbackPermission: ConnectorToolPermission = DEFAULT_CONNECTOR_TOOL_PERMISSION
): ConnectorTool[] {
	return tools.map((tool) => normalizeConnectorTool(tool, fallbackPermission));
}

function normalizeConnectorTool(
	tool: ConnectorTool,
	fallbackPermission: ConnectorToolPermission = DEFAULT_CONNECTOR_TOOL_PERMISSION
): ConnectorTool {
	const permission = normalizeToolPermission(tool.permission, tool.requiresApproval, fallbackPermission);
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
		permission,
		requiresApproval: permission === 'needs-approval',
	};
}

function normalizeToolPermission(
	permission: unknown,
	requiresApproval: unknown,
	fallbackPermission: ConnectorToolPermission
): ConnectorToolPermission {
	if (typeof permission === 'string' && (CONNECTOR_TOOL_PERMISSIONS as readonly string[]).includes(permission)) {
		return permission as ConnectorToolPermission;
	}
	if (requiresApproval === true) return 'needs-approval';
	if (requiresApproval === false) return 'always-allow';
	return fallbackPermission;
}

function redactConnectorSecrets(connector: ConnectorConfig): ConnectorConfig {
	return {
		...connector,
		authorization: '',
		mcp: redactMcpConfig(connector.mcp),
		oauth: redactOAuthConfig(connector.oauth),
	};
}

function redactMcpConfig(mcp: ConnectorMcpConfig | undefined): ConnectorMcpConfig | undefined {
	if (!mcp) return undefined;
	if (mcp.transport === 'http') {
		return {
			...mcp,
			headers: mcp.headers
				? Object.fromEntries(Object.keys(mcp.headers).map((key) => [key, '']))
				: undefined,
		};
	}
	return { ...mcp, env: mcp.env ? Object.fromEntries(Object.keys(mcp.env).map((key) => [key, ''])) : undefined };
}

function redactOAuthConfig(oauth: ConnectorConfig['oauth']): ConnectorConfig['oauth'] {
	if (!oauth) return undefined;
	return {
		...oauth,
		token: oauth.token
			? {
				...oauth.token,
				accessToken: '',
				refreshToken: oauth.token.refreshToken ? '' : undefined,
			}
			: undefined,
	};
}

function missingSecretMessage(connector: ConnectorConfig): string | undefined {
	const missing = missingMcpSecretNames(connector);
	return missing.length > 0 ? 'Missing MCP secret environment variable: ' + missing.join(', ') : undefined;
}

function permissionForTool(connector: ConnectorConfig, toolName: string): ConnectorToolPermission {
	if (connector.oauth) return DEFAULT_CONNECTOR_TOOL_PERMISSION;
	if (connector.allowedTools.length > 0 && !connector.allowedTools.includes(toolName)) return 'blocked';
	if (connector.requireApproval === 'never') return 'always-allow';
	if (connector.requireApproval === 'never_for_allowed_tools' && connector.allowedTools.includes(toolName)) return 'always-allow';
	return 'needs-approval';
}

function agentToolNameFor(connector: ConnectorConfig, toolName: string): string {
	return (connector.serverLabel + '_' + toolName)
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function schemaForTool(tool: ConnectorTool): AgentTool['schema'] {
	const schema = tool.inputSchema;
	if (schema && typeof schema === 'object' && !Array.isArray(schema)) return schema as JSONSchema;
	return { type: 'object', properties: {}, additionalProperties: true };
}

function environmentSecretNamesFor(mcp: ConnectorMcpConfig | undefined): string[] {
	if (!mcp) return [];
	if (mcp.transport === 'http') return mcp.auth?.env ? [mcp.auth.env] : [];
	return (mcp.envSecrets ?? []).map((secret) => secret.env);
}

function normalizeCatalogEntry(entry: ConnectorCatalogEntry): ConnectorCatalogEntry {
	assertConnectorId(entry.id);
	return {
		id: entry.id,
		directConnectorId: entry.directConnectorId,
		name: entry.name?.trim() || entry.id,
		description: entry.description?.trim() || entry.name?.trim() || entry.id,
		docsPath: entry.docsPath,
		docsLabel: entry.docsLabel,
		environmentSecretNames: Array.from(new Set(entry.environmentSecretNames ?? [])),
		platformDocumentationPages: entry.platformDocumentationPages ?? [],
		example: entry.example,
		tools: Array.from(new Set(entry.tools ?? [])),
		scopes: entry.scopes ?? [],
		setupUrl: entry.setupUrl,
		setupInstructions: entry.setupInstructions ?? [],
		authKind: entry.authKind ?? 'mcp_env',
		redirectUri: entry.redirectUri,
		runtimeKind: entry.runtimeKind ?? 'mcp',
		allowMultipleInstances: entry.allowMultipleInstances ?? true,
		mcp: entry.mcp,
		oauth: entry.oauth,
	};
}

function oauthAuthorizationUrl(
	connector: ConnectorCatalogEntry,
	clientId: string,
	state: string
): string {
	if (!connector.oauth) throw new Error('OAuth connector is missing OAuth metadata: ' + connector.id);
	const params = new URLSearchParams({
		...connector.oauth.authorizationParams,
		client_id: clientId,
		redirect_uri: connector.oauth.redirectUri,
		scope: connector.scopes.join(' '),
		state,
	});
	return `${connector.oauth.authorizationUrl}?${params.toString()}`;
}

function mergeCatalogEntries(entries: ConnectorCatalogEntry[]): ConnectorCatalogEntry[] {
	const byId = new Map<ConnectorProviderId, ConnectorCatalogEntry>();
	for (const entry of entries) byId.set(entry.id, { ...byId.get(entry.id), ...entry });
	return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
}
