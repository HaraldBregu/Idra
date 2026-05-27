import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { shell } from 'electron';
import Store from 'electron-store';
import type { LoggerService } from '../logger';
import { resolveDefaultAppDataPath } from '../agent/storage';
import { DEFAULT_CONNECTOR_TOOL_PERMISSION } from '../../shared/connector';
import {
	AgentMcpClientService,
	authorizationFromMcp,
	connectorAuthKindFor,
	connectorHasAuthorization,
	connectorStatusFor,
	type AgentMcpClientServicePort,
	type ConnectorMcpClientFactory,
	type McpConnectorStore,
} from '../agent/mcp-client';
import type {
	ConnectorCatalogEntry,
	ConnectorConfig,
	ConnectorInput,
	ConnectorMcpConfig,
	ConnectorMcpEnvSecret,
	ConnectorMcpHeaderSecret,
	ConnectorOAuthAuthorizeResult,
	ConnectorOAuthCompleteInput,
	ConnectorProviderId,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorToolPermission,
} from '../../shared/connector';

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
	set(key: string, value: unknown): void;
	delete(key: string): void;
	store?: Record<string, unknown>;
}

interface ConnectorToolPersistenceStore {
	get(key: string): unknown;
	set(key: string, value: Record<string, ConnectorTool[]>): void;
	delete(key: string): void;
}

type ConnectorCatalogProvider =
	| readonly ConnectorCatalogEntry[]
	| (() => readonly ConnectorCatalogEntry[] | Promise<readonly ConnectorCatalogEntry[]>);
type OAuthCallbackListenerFactory = (state: string, timeoutMs?: number) => Promise<OAuthCallbackListener>;

type RuntimeConnector = ConnectorConfig & {
	id: string;
	name: string;
	connectorId: ConnectorProviderId;
	serverLabel: string;
	enabled: boolean;
	authorization: string;
	requireApproval: NonNullable<ConnectorConfig['requireApproval']>;
	allowedTools: string[];
	deferLoading: boolean;
	tools: ConnectorTool[];
	createdAt: string;
	updatedAt: string;
};

interface ConnectorsServiceOptions {
	store?: ConnectorPersistenceStore;
	toolStore?: ConnectorToolPersistenceStore;
	catalogProvider?: ConnectorCatalogProvider;
	mcpClient?: AgentMcpClientServicePort;
	mcpClientFactory?: ConnectorMcpClientFactory;
	openExternalUrl?: (url: string) => Promise<void>;
	fetch?: typeof fetch;
	oauthCallbackTimeoutMs?: number;
	oauthCallbackListenerFactory?: OAuthCallbackListenerFactory;
	env?: NodeJS.ProcessEnv;
}

interface OAuthCallbackListener {
	redirectUri: string;
	code: Promise<string>;
	close(): Promise<void>;
}

interface OAuthTokenExchangeInput {
	state: string;
	code: string;
	codeVerifier: string;
	redirectUri: string;
	clientId: string;
	clientSecret?: string;
	fetch: typeof fetch;
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

function toView(connector: RuntimeConnector): ConnectorConfig {
	const redacted = redactConnectorSecrets(connector);
	return {
		...redacted,
		authKind: connectorAuthKindFor(connector),
		status: connectorStatusFor(connector),
		allowedToolsCount: connector.allowedTools.length,
		toolsCount: connector.tools.length,
		hasToken: connectorHasAuthorization(connector),
		hasTools: connector.tools.length > 0,
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

export class ConnectorsService implements McpConnectorStore {
	private readonly store: ConnectorPersistenceStore;
	private readonly toolStore?: ConnectorToolPersistenceStore;
	private readonly mcpClient: AgentMcpClientServicePort;
	private readonly runtimeConnectors = new Map<string, RuntimeConnector>();
	private readonly pendingOAuthConnectors = new Map<string, RuntimeConnector>();

	constructor(
		private readonly logger: LoggerService,
		private readonly options: ConnectorsServiceOptions = {}
	) {
		this.store =
			options.store ??
			(new Store<Record<string, unknown>>({
				name: CONNECTOR_STORE_NAME,
				cwd: resolveDefaultAppDataPath(),
				accessPropertiesByDotNotation: false,
			}) as ConnectorPersistenceStore);
		this.toolStore = options.toolStore;
		this.mcpClient = options.mcpClient ?? new AgentMcpClientService(logger, this, {
			mcpClientFactory: options.mcpClientFactory,
		});
	}

	async catalog(): Promise<ConnectorCatalogEntry[]> {
		const catalogEntries = await this.catalogEntriesFromProvider();
		const oauthConnectorIds = new Set(catalogEntries.filter((entry) => entry.oauth).map((entry) => entry.id));
		return mergeCatalogEntries([
			...catalogEntries,
			...this.validConnectors()
				.filter((connector) => !connector.oauth && !oauthConnectorIds.has(connector.connectorId))
				.map((connector) => this.catalogEntryFromConnector(connector)),
		]);
	}

	list(): ConnectorConfig[] {
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
		const definition = await this.oauthCatalogEntry(connectorId, input);
		if (!definition?.oauth) throw new Error('OAuth connector not found: ' + connectorId);

		const clientIdEnv = definition.oauth.clientIdEnv;
		const clientId = this.options.env?.[clientIdEnv] ?? process.env[clientIdEnv];
		if (!clientId?.trim()) throw new Error('Missing OAuth client id environment variable: ' + clientIdEnv);

		const state = randomUUID();
		const codeVerifier = createPkceCodeVerifier();
		const codeChallenge = createPkceCodeChallenge(codeVerifier);
		const callback = await (this.options.oauthCallbackListenerFactory ?? createOAuthCallbackListener)(
			state,
			this.options.oauthCallbackTimeoutMs
		);
		const authorizationUrl = oauthAuthorizationUrl(
			definition,
			clientId.trim(),
			state,
			callback.redirectUri,
			codeChallenge
		);
		const now = new Date().toISOString();
		const existing = this.validConnectors().find((connector) => connector.connectorId === definition.id);
		const requireApproval = existing?.requireApproval ?? 'always';
		const allowedTools = existing?.allowedTools ?? [];
		const connector: RuntimeConnector = {
			id: existing?.id ?? definition.id,
			name: existing?.name ?? definition.name,
			connectorId: definition.id,
			serverLabel: existing?.serverLabel ?? serverLabelFromName(definition.name),
			serverDescription: existing?.serverDescription,
			enabled: true,
			authorization: existing?.authorization || oauthAuthorizationHeader(existing?.oauth?.token) || authorizationFromMcp(existing?.mcp),
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
				redirectUri: callback.redirectUri,
				scopes: definition.scopes,
				state,
				accountEmail: existing?.oauth?.accountEmail,
				token: existing?.oauth?.token,
			},
		};
		const next = normalizeStoredConnector(await this.mcpClient.refreshConnectorToolsIfConfigured(connector));

		this.pendingOAuthConnectors.set(state, next);
		this.replace(next);
		try {
			await (this.options.openExternalUrl ?? shell.openExternal)(authorizationUrl);
			const code = await callback.code;
			const completed = this.completeOAuth(await exchangeOAuthCode(definition, {
				code,
				state,
				codeVerifier,
				redirectUri: callback.redirectUri,
				clientId: clientId.trim(),
				clientSecret: this.oauthClientSecret(definition),
				fetch: this.options.fetch ?? fetch,
			}));
			return {
				connectorId: definition.id,
				authorizationUrl,
				connector: completed,
			};
		} catch (error) {
			this.replace({ ...next, lastError: this.errorMessage(error), updatedAt: new Date().toISOString() });
			throw error;
		} finally {
			await callback.close();
		}
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

		const current = this.validConnectors().find((connector) => connector.oauth?.state === state) ??
			this.pendingOAuthConnectors.get(state);
		if (!current?.oauth) throw new Error('OAuth connector not found for state: ' + state);
		const token = {
			accessToken,
			refreshToken,
			tokenType,
			scope,
			expiresAt: typeof expiresIn === 'number'
				? new Date(Date.now() + expiresIn * 1000).toISOString()
				: undefined,
		};
		const next: RuntimeConnector = {
			...current,
			authorization: oauthAuthorizationHeader(token),
			lastError: undefined,
			updatedAt: new Date().toISOString(),
			oauth: {
				...current.oauth,
				accountEmail: accountEmail || current.oauth.accountEmail,
				token,
			},
		};
		this.pendingOAuthConnectors.set(state, next);
		this.replace(next);
		return redactConnectorSecrets(next);
	}

	restoreEnabledConnectors(): void {
		this.writeAll(this.validConnectors());
	}

	async add(input: unknown): Promise<ConnectorConfig> {
		const sanitized = this.validateConnectorInput('add', () => sanitizeInput(input));
		const now = new Date().toISOString();
		const serverLabel = uniqueConnectorStorageKey(
			sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
			this.validConnectors()
		);
		const connector: RuntimeConnector = {
			id: serverLabel,
			name: sanitized.name,
			connectorId: sanitized.connectorId,
			serverLabel,
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
		const next = normalizeStoredConnector(await this.mcpClient.refreshConnectorToolsIfConfigured(connector));
		this.writeConnector(next);
		return redactConnectorSecrets(next);
	}

	async update(id: string, input: unknown): Promise<ConnectorConfig> {
		const current = this.getStored(id);
		const sanitized = this.validateConnectorInput('update', () => sanitizeInput(input, current));
		const next = normalizeStoredConnector(await this.mcpClient.refreshConnectorToolsIfConfigured({
			...current,
			...sanitized,
			authorization: '',
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		}));
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
		return this.mcpClient.test(id);
	}

	async reconnect(id: string): Promise<ConnectorTestResult> {
		return this.mcpClient.reconnect(id);
	}


	async refreshTools(id: string): Promise<ConnectorTool[]> {
		return this.mcpClient.refreshTools(id);
	}

	listTools(id: string): ConnectorTool[] {
		return this.mcpClient.listTools(id);
	}

	async callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		return this.mcpClient.callTool(id, name, args, options);
	}

	async listResources(id: unknown, options?: unknown): Promise<unknown> {
		return this.mcpClient.listResources(id, options);
	}

	async readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown> {
		return this.mcpClient.readResource(id, uri, options);
	}

	async listPrompts(id: unknown, options?: unknown): Promise<unknown> {
		return this.mcpClient.listPrompts(id, options);
	}

	async getPrompt(
		id: unknown,
		name: unknown,
		args?: unknown,
		options?: unknown
	): Promise<unknown> {
		return this.mcpClient.getPrompt(id, name, args, options);
	}

	createAgentTools() {
		return this.mcpClient.createAgentTools();
	}

	async close(): Promise<void> {
		await this.mcpClient.close();
	}

	private getStored(id: string): RuntimeConnector {
		const connector = this.validConnectors().find((item) => item.id === id);
		if (!connector) throw new Error('Connector not found: ' + id);
		return connector;
	}

	private validConnectors(): RuntimeConnector[] {
		return this.readStoredConnectors()
			.map((connector) => this.mergeRuntimeConnector(connector))
			.map((connector) => {
				if (connector.tools.length > 0) return connector;
				const legacyTools = this.readLegacyTools(connector.id);
				return legacyTools.length > 0 ? { ...connector, tools: legacyTools } : connector;
			});
	}

	private replace(connector: RuntimeConnector): void {
		void this.closeClient(connector.id);
		const connectors = this.validConnectors();
		const next = connectors.some((item) => item.id === connector.id)
			? connectors.map((item) => (item.id === connector.id ? connector : item))
			: [...connectors, connector];
		this.writeAll(next);
		this.logDebug('Updated connector ' + connector.name, { connectorId: connector.connectorId });
	}

	private readStoredConnectors(): RuntimeConnector[] {
		this.logDebug('Read connector settings');
		const raw = this.readConnectorStore();
		if (raw === undefined) return [];
		if (Array.isArray(raw)) {
			return raw.flatMap((entry, index) => this.normalizeStoredConnectorEntry(entry, index));
		}
		const record = readRecord(raw);
		if (record) {
			return Object.entries(record).flatMap(([key, entry], index) =>
				this.normalizeStoredConnectorEntry(entry, index, key)
			);
		}
		this.logWarn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY, reason: 'not_object' });
		return [];
	}

	private normalizeStoredConnectorEntry(entry: unknown, index: number, storageKey?: string): RuntimeConnector[] {
		const record = readRecord(entry);
		if (!record) {
			this.logWarn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY, index, reason: 'not_object' });
			return [];
			}
			const connector = record as unknown as ConnectorConfig;
			if (!isStoredConnectorValid(connector, storageKey)) {
				this.logWarn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY, index, connectorId: record.connectorId ?? storageKey });
				return [];
			}
		try {
			return [normalizeStoredConnector(connector, storageKey)];
		} catch (error) {
			this.logError('Failed to normalize connector settings', { key: CONNECTOR_STORE_KEY, index, error: this.errorMessage(error) });
			return [];
		}
	}

	private readConnectorStore(): unknown {
		try {
			const root = this.store.store;
			if (root && typeof root === 'object' && !Array.isArray(root)) {
				const legacy = root[CONNECTOR_STORE_KEY];
				return legacy === undefined ? root : legacy;
			}
			return this.store.get(CONNECTOR_STORE_KEY);
		} catch (error) {
			this.logError('Failed to read connector settings', { key: CONNECTOR_STORE_KEY, error: this.errorMessage(error) });
			throw error;
		}
	}

	private writeConnector(connector: RuntimeConnector): void {
		this.writeAll([...this.validConnectors(), connector]);
	}

	private writeAll(connectors: RuntimeConnector[]): void {
		const records = toStoredConnectorRecords(connectors);
		try {
			this.runtimeConnectors.clear();
			for (const connector of connectors) this.runtimeConnectors.set(connector.id, connector);
			if ('store' in this.store) {
				this.store.store = records;
			} else {
				this.store.set(CONNECTOR_STORE_KEY, records);
			}
			this.logDebug('Wrote connector settings', { key: CONNECTOR_STORE_KEY, count: connectors.length });
		} catch (error) {
			this.logError('Failed to write connector settings', { key: CONNECTOR_STORE_KEY, error: this.errorMessage(error) });
			throw error;
		}
	}

	private mergeRuntimeConnector(connector: RuntimeConnector): RuntimeConnector {
		const runtime = this.runtimeConnectors.get(connector.id);
		if (!runtime) return connector;
		return {
			...connector,
			...runtime,
			mcp: connector.mcp ?? runtime.mcp,
			authorization: connector.authorization || runtime.authorization,
			tools: connector.tools.length > 0 ? connector.tools : runtime.tools,
		};
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
			: (provider ?? []) as ConnectorCatalogEntry[];
		return entries.map(normalizeCatalogEntry);
	}

	private async oauthCatalogEntry(id: string, input: unknown): Promise<ConnectorCatalogEntry | undefined> {
		const request = requireObject(input, 'OAuth authorization request');
		const provided = readOptionalCatalogEntry(request.connector, id);
		if (provided) return provided;
		return (await this.catalogEntriesFromProvider()).find((entry) => entry.id === id && entry.oauth);
	}

	private oauthClientSecret(definition: ConnectorCatalogEntry): string | undefined {
		const secretEnv = definition.oauth?.clientSecretEnv;
		if (!secretEnv) return undefined;
		return (this.options.env?.[secretEnv] ?? process.env[secretEnv])?.trim() || undefined;
	}

	private catalogEntryFromConnector(connector: RuntimeConnector): ConnectorCatalogEntry {
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

function isStoredConnectorValid(connector: ConnectorConfig, storageKey?: string): boolean {
	return (
		(
			typeof connector.id === 'string' &&
			typeof connector.name === 'string' &&
			typeof connector.connectorId === 'string' &&
			CONNECTOR_ID_PATTERN.test(connector.connectorId)
		) ||
		Boolean(storageKey && connector.mcp)
	);
}

function normalizeStoredConnector(connector: ConnectorConfig, storageKey?: string): RuntimeConnector {
	const metadata = connectorMetadataFromStorage(connector, storageKey);
	const name = connector.name ?? metadata?.name ?? titleFromStorageKey(storageKey) ?? 'MCP Connector';
	const connectorId = connector.connectorId ?? metadata?.connectorId ?? storageKey ?? serverLabelFromName(name);
	const serverLabel = connector.serverLabel ?? storageKey ?? serverLabelFromName(name);
	const createdAt = typeof connector.createdAt === 'string' ? connector.createdAt : '';
	const updatedAt = typeof connector.updatedAt === 'string' ? connector.updatedAt : createdAt;
	return {
		...connector,
		id: typeof connector.id === 'string' ? connector.id : metadata?.id ?? storageKey ?? connectorId,
		name,
		connectorId,
		serverLabel,
		authorization: typeof connector.authorization === 'string'
			? connector.authorization
			: authorizationFromMcp(connector.mcp),
		enabled: typeof connector.enabled === 'boolean' ? connector.enabled : true,
		requireApproval: connector.requireApproval ?? 'always',
		allowedTools: Array.isArray(connector.allowedTools) ? connector.allowedTools : [],
		deferLoading: typeof connector.deferLoading === 'boolean' ? connector.deferLoading : false,
		tools: Array.isArray(connector.tools)
			? connector.tools.flatMap((tool) => isConnectorToolRecord(tool) ? [normalizeConnectorTool(tool)] : [])
			: [],
		createdAt,
		updatedAt,
	};
}

function toStoredConnectorRecords(connectors: readonly RuntimeConnector[]): Record<string, ConnectorConfig> {
	const records: Record<string, ConnectorConfig> = {};
	for (const connector of connectors) {
		const normalized = normalizeStoredConnector(connector);
		const baseKey = connectorStorageKey(normalized);
		let key = baseKey;
		let suffix = 2;
		while (records[key]) {
			key = baseKey + '_' + suffix;
			suffix += 1;
		}
		records[key] = toStoredConnectorRecord(normalized);
	}
	return records;
}

function connectorStorageKey(connector: ConnectorConfig): string {
	return sanitizeConnectorStorageKey(connector.serverLabel ?? connector.connectorId ?? connector.id ?? connector.name ?? 'connector');
}

function uniqueConnectorStorageKey(value: string, connectors: readonly RuntimeConnector[]): string {
	const existing = new Set(connectors.map((connector) => connectorStorageKey(connector)));
	const baseKey = sanitizeConnectorStorageKey(value);
	let key = baseKey;
	let suffix = 2;
	while (existing.has(key)) {
		key = baseKey + '_' + suffix;
		suffix += 1;
	}
	return key;
}

function toStoredConnectorRecord(connector: RuntimeConnector): ConnectorConfig {
	const mcp = mcpWithConnectorAuthorization(connector);
	return {
		...(mcp ? { mcp: compactMcpConfig(mcp) } : {}),
		tools: connector.tools,
	};
}

function sanitizeConnectorStorageKey(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '') || 'connector';
}

function titleFromStorageKey(storageKey?: string): string | undefined {
	if (!storageKey) return undefined;
	const words = storageKey
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (words.length === 0) return undefined;
	return words.map((word) => {
		const lower = word.toLowerCase();
		if (lower === 'mcp') return 'MCP';
		return word.charAt(0).toUpperCase() + word.slice(1);
	}).join(' ');
}

function connectorMetadataFromStorage(
	connector: ConnectorConfig,
	storageKey?: string
): { id: string; connectorId: ConnectorProviderId; name: string } | undefined {
	const key = storageKey?.trim().toLowerCase();
	if (key === 'gmail') return { id: 'google.gmail', connectorId: 'google.gmail', name: 'Gmail' };
	if (key === 'google_calendar') return { id: 'google.calendar', connectorId: 'google.calendar', name: 'Google Calendar' };
	if (key === 'google_drive') return { id: 'google.drive', connectorId: 'google.drive', name: 'Google Drive' };
	if (connector.mcp?.transport !== 'http') return undefined;
	const url = connector.mcp.url;
	if (url === 'https://gmailmcp.googleapis.com/mcp/v1') return { id: 'google.gmail', connectorId: 'google.gmail', name: 'Gmail' };
	if (url === 'https://calendarmcp.googleapis.com/mcp/v1') {
		return { id: 'google.calendar', connectorId: 'google.calendar', name: 'Google Calendar' };
	}
	if (url === 'https://drivemcp.googleapis.com/mcp/v1') {
		return { id: 'google.drive', connectorId: 'google.drive', name: 'Google Drive' };
	}
	return undefined;
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

function authKindFor(connector: ConnectorConfig): NonNullable<ConnectorConfig['authKind']> {
	return connector.oauth || isOAuthMcpConfig(connector.mcp) ? 'oauth' : 'mcp_env';
}

function isOAuthMcpConfig(mcp: ConnectorMcpConfig | undefined): boolean {
	if (mcp?.transport !== 'http') return false;
	return (
		mcp.url === 'https://gmailmcp.googleapis.com/mcp/v1' ||
		mcp.url === 'https://calendarmcp.googleapis.com/mcp/v1' ||
		mcp.url === 'https://drivemcp.googleapis.com/mcp/v1'
	);
}

function hasConnectorAuthorization(connector: ConnectorConfig): boolean {
	return Boolean(
		connector.oauth?.token?.accessToken ||
		connector.authorization?.trim() ||
		authorizationFromMcp(connector.mcp)
	);
}

function authorizationFromMcp(mcp: ConnectorMcpConfig | undefined): string {
	if (mcp?.transport !== 'http') return '';
	for (const [key, value] of Object.entries(mcp.headers ?? {})) {
		if (key.toLowerCase() === 'authorization') return value.trim();
	}
	return '';
}

function mcpWithConnectorAuthorization(connector: RuntimeConnector): ConnectorMcpConfig | undefined {
	if (!connector.mcp) return undefined;
	const authorization =
		connector.authorization ||
		oauthAuthorizationHeader(connector.oauth?.token) ||
		authorizationFromMcp(connector.mcp);
	if (connector.mcp.transport !== 'http' || !authorization) return connector.mcp;
	return {
		...connector.mcp,
		headers: {
			...(connector.mcp.headers ?? {}),
			Authorization: authorization,
		},
	};
}

function compactMcpConfig(mcp: ConnectorMcpConfig): ConnectorMcpConfig {
	if (mcp.transport === 'http') {
		return {
			transport: 'http',
			url: mcp.url,
			...(mcp.method ? { method: mcp.method } : {}),
			...(mcp.headers && Object.keys(mcp.headers).length > 0 ? { headers: mcp.headers } : {}),
			...(mcp.sessionId ? { sessionId: mcp.sessionId } : {}),
			...(mcp.auth ? { auth: mcp.auth } : {}),
		};
	}
	return {
		transport: 'stdio',
		command: mcp.command,
		...(mcp.args ? { args: mcp.args } : {}),
		...(mcp.cwd ? { cwd: mcp.cwd } : {}),
		...(mcp.env && Object.keys(mcp.env).length > 0 ? { env: mcp.env } : {}),
		...(mcp.envSecrets ? { envSecrets: mcp.envSecrets } : {}),
	};
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

function oauthAuthorizationHeader(token: NonNullable<ConnectorConfig['oauth']>['token']): string {
	if (!token?.accessToken) return '';
	return (token.tokenType?.trim() || 'Bearer') + ' ' + token.accessToken;
}

function permissionForTool(connector: RuntimeConnector, toolName: string): ConnectorToolPermission {
	if (connector.oauth || isOAuthMcpConfig(connector.mcp)) return DEFAULT_CONNECTOR_TOOL_PERMISSION;
	if (connector.allowedTools.length > 0 && !connector.allowedTools.includes(toolName)) return 'blocked';
	if (connector.requireApproval === 'never') return 'always-allow';
	if (connector.requireApproval === 'never_for_allowed_tools' && connector.allowedTools.includes(toolName)) return 'always-allow';
	return 'needs-approval';
}

function agentToolNameFor(connector: RuntimeConnector, toolName: string): string {
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

function readOptionalCatalogEntry(value: unknown, expectedId: string): ConnectorCatalogEntry | undefined {
	if (value === undefined || value === null) return undefined;
	const entry = normalizeCatalogEntry(value as ConnectorCatalogEntry);
	if (entry.id !== expectedId) throw new Error('OAuth connector definition id must match connector id.');
	return entry;
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
		oauth: entry.oauth
			? {
				...entry.oauth,
				clientSecretEnv: entry.oauth.clientSecretEnv,
				tokenUrl: readRequiredString(entry.oauth.tokenUrl, 'OAuth token URL'),
			}
			: undefined,
	};
}

function createPkceCodeVerifier(): string {
	return randomBytes(32).toString('base64url');
}

function createPkceCodeChallenge(verifier: string): string {
	return createHash('sha256').update(verifier).digest('base64url');
}

async function createOAuthCallbackListener(
	state: string,
	timeoutMs = 120_000
): Promise<OAuthCallbackListener> {
	let settled = false;
	let timeout: NodeJS.Timeout;
	let resolveCode: (code: string) => void;
	let rejectCode: (error: Error) => void;
	const code = new Promise<string>((resolve, reject) => {
		resolveCode = resolve;
		rejectCode = reject;
	});
	const server = createServer((request, response) => {
		const url = new URL(request.url ?? '/', 'http://127.0.0.1');
		if (url.pathname !== '/oauth/callback') {
			sendOAuthCallbackResponse(response, 404, 'OAuth callback not found.');
			return;
		}
		const returnedState = url.searchParams.get('state');
		if (returnedState !== state) {
			sendOAuthCallbackResponse(response, 400, 'OAuth state did not match.');
			settleOAuthCallback(new Error('OAuth state did not match.'));
			return;
		}
		const error = url.searchParams.get('error');
		if (error) {
			const description = url.searchParams.get('error_description');
			sendOAuthCallbackResponse(response, 400, 'OAuth authorization failed.');
			settleOAuthCallback(new Error(description ? error + ': ' + description : error));
			return;
		}
		const authCode = url.searchParams.get('code');
		if (!authCode) {
			sendOAuthCallbackResponse(response, 400, 'OAuth authorization code was missing.');
			settleOAuthCallback(new Error('OAuth authorization code was missing.'));
			return;
		}
		sendOAuthCallbackResponse(response, 200, 'Authorization complete. You can return to Friday.');
		settleOAuthCallback(undefined, authCode);
	});
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			server.off('error', reject);
			resolve();
		});
	});
	timeout = setTimeout(() => {
		settleOAuthCallback(new Error('OAuth authorization timed out.'));
	}, timeoutMs);
	const address = server.address() as AddressInfo;
	return {
		redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
		code,
		close: () => closeServer(server),
	};

	function settleOAuthCallback(error?: Error, authCode?: string): void {
		if (settled) return;
		settled = true;
		clearTimeout(timeout);
		if (error) {
			rejectCode(error);
		} else {
			resolveCode(authCode ?? '');
		}
	}
}

function sendOAuthCallbackResponse(response: ServerResponse, statusCode: number, message: string): void {
	response.writeHead(statusCode, { 'content-type': 'text/html; charset=utf-8' });
	response.end('<!doctype html><title>Friday OAuth</title><p>' + escapeHtml(message) + '</p>');
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

async function closeServer(server: Server): Promise<void> {
	if (!server.listening) return;
	await new Promise<void>((resolve) => {
		server.close(() => resolve());
	});
}

async function exchangeOAuthCode(
	definition: ConnectorCatalogEntry,
	input: OAuthTokenExchangeInput
): Promise<ConnectorOAuthCompleteInput> {
	if (!definition.oauth) throw new Error('OAuth connector is missing OAuth metadata: ' + definition.id);
	const body = new URLSearchParams({
		client_id: input.clientId,
		code: input.code,
		code_verifier: input.codeVerifier,
		grant_type: 'authorization_code',
		redirect_uri: input.redirectUri,
	});
	if (input.clientSecret) body.set('client_secret', input.clientSecret);
	const response = await input.fetch(definition.oauth.tokenUrl, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body,
	});
	const text = await response.text();
	const payload = parseJsonObject(text);
	if (!response.ok) {
		throw new Error('OAuth token exchange failed: ' + oauthTokenErrorMessage(payload, response.statusText));
	}
	return {
		state: input.state,
		accessToken: readRequiredString(payload.access_token, 'OAuth access token'),
		refreshToken: readOptionalTokenString(payload, 'refresh_token'),
		tokenType: readOptionalTokenString(payload, 'token_type'),
		scope: readOptionalTokenString(payload, 'scope'),
		expiresIn: readOptionalTokenNumber(payload, 'expires_in'),
	};
}

function parseJsonObject(text: string): Record<string, unknown> {
	try {
		const value = JSON.parse(text);
		if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
	} catch {
		return {};
	}
	return {};
}

function readOptionalTokenString(payload: Record<string, unknown>, key: string): string | undefined {
	const value = payload[key];
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readOptionalTokenNumber(payload: Record<string, unknown>, key: string): number | undefined {
	const value = payload[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function oauthTokenErrorMessage(payload: Record<string, unknown>, statusText: string): string {
	const error = readOptionalTokenString(payload, 'error');
	const description = readOptionalTokenString(payload, 'error_description');
	if (error && description) return error + ': ' + description;
	return description || error || statusText || 'request failed';
}

function oauthAuthorizationUrl(
	connector: ConnectorCatalogEntry,
	clientId: string,
	state: string,
	redirectUri: string,
	codeChallenge: string
): string {
	if (!connector.oauth) throw new Error('OAuth connector is missing OAuth metadata: ' + connector.id);
	const params = new URLSearchParams({
		...connector.oauth.authorizationParams,
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: connector.scopes.join(' '),
		state,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256',
	});
	return `${connector.oauth.authorizationUrl}?${params.toString()}`;
}

function mergeCatalogEntries(entries: ConnectorCatalogEntry[]): ConnectorCatalogEntry[] {
	const byId = new Map<ConnectorProviderId, ConnectorCatalogEntry>();
	for (const entry of entries) byId.set(entry.id, { ...byId.get(entry.id), ...entry });
	return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
}
