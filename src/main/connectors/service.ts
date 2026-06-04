import { randomUUID } from 'node:crypto';
import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { LoggerService } from '../observability';
import type { AgentTool, ToolContext } from '../tools/shared/types';
import { textResult } from '../tools/shared/types';
import {
	type ConnectorApprovalMode,
	type ConnectorCallToolOptions,
	type ConnectorCatalogEntry,
	type ConnectorConfig,
	type ConnectorInput,
	type ConnectorOAuthAuthorizeRequest,
	type ConnectorOAuthAuthorizeResult,
	type ConnectorOAuthCompleteInput,
	type ConnectorOAuthConnectResult,
	type ConnectorStatus,
	type ConnectorTestResult,
	type ConnectorTool,
	type ConnectorView,
	type OpenAiConnectorRequireApproval,
	type OpenAiMcpConnectorToolSpec,
} from '../../shared/connector';

type ConnectorsStoreSchema = { connectors?: ConnectorConfig[] };
type ConnectorsStore = {
	get(key: 'connectors'): unknown;
	set(key: 'connectors', value: ConnectorConfig[]): void;
};

type ConnectorMcpClient = {
	listTools(): Promise<ConnectorTool[]>;
	callTool(name: string, args: Record<string, unknown>, options?: ConnectorCallToolOptions): Promise<unknown>;
	listResources?(): Promise<unknown>;
	readResource?(uri: string, options?: unknown): Promise<unknown>;
	listPrompts?(options?: unknown): Promise<unknown>;
	getPrompt?(name: string, args: Record<string, unknown>, options?: unknown): Promise<unknown>;
	close?(): Promise<void>;
};

interface ConnectorsServiceOptions {
	mcpClientFactory?: (connector: ConnectorConfig, secrets: Record<string, string>) => ConnectorMcpClient;
	env?: NodeJS.ProcessEnv;
}

const CONNECTOR_STORE_KEY = 'connectors';
const DEFAULT_CONNECTOR_STORE_DIR = 'friday';

export class ConnectorsService {
	private readonly store: ConnectorsStore;
	private readonly logger: LoggerService;
	private readonly options: ConnectorsServiceOptions;

	constructor(logger: LoggerService, options?: ConnectorsServiceOptions) {
		this.logger = logger;
		this.options = options ?? {};
		this.store = new Store<ConnectorsStoreSchema>({
			name: 'connectors',
			cwd: path.join(resolveAppDataPath(), DEFAULT_CONNECTOR_STORE_DIR),
			accessPropertiesByDotNotation: false,
		}) as unknown as ConnectorsStore;
	}

	catalog(): readonly ConnectorCatalogEntry[] {
		return [];
	}

	list(): ConnectorView[] {
		return this.validConnectors().map((connector) => toView(connector, this.env()));
	}

	get(id: string): ConnectorConfig {
		return redactConnectorSecrets(this.getStored(id));
	}

	async add(input: unknown): Promise<ConnectorConfig> {
		try {
			const now = new Date().toISOString();
			const sanitized = sanitizeInput(input);
			const connector: ConnectorConfig = {
				id: randomUUID(),
				name: sanitized.name,
				connectorId: sanitized.connectorId,
				serverLabel: sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
				serverDescription: sanitized.serverDescription,
				enabled: sanitized.enabled ?? true,
				serverUrl: sanitized.serverUrl,
				authorization: sanitized.authorization ?? '',
				mcp: cloneValue(sanitized.mcp),
				oauth: undefined,
				requireApproval: sanitized.requireApproval ?? 'always',
				allowedTools: sanitized.allowedTools ?? [],
				deferLoading: sanitized.deferLoading ?? false,
				tools: [],
				createdAt: now,
				updatedAt: now,
			};
			const next = isOpenAiResponsesConnector(connector)
				? withOpenAiResponsesConnectorTools(connector)
				: hasMissingMcpSecrets(connector, this.env())
					? connector
					: await this.withDiscoveredTools(connector, true);
			this.writeConnectors([...this.validConnectors(), next]);
			return redactConnectorSecrets(next);
		} catch (error) {
			this.warn('Connector validation failed', { action: 'add', error: errorMessage(error) });
			throw error;
		}
	}

	async update(id: string, input: unknown): Promise<ConnectorConfig> {
		const current = this.getStored(id);
		const patch = requireObject(input, 'Connector update');
		const merged = sanitizeInput({
			name: readOptionalString(patch, 'name') ?? current.name,
			connectorId: readOptionalString(patch, 'connectorId') ?? current.connectorId,
			serverLabel: readOptionalString(patch, 'serverLabel') ?? current.serverLabel,
			serverDescription: readOptionalString(patch, 'serverDescription') ?? current.serverDescription,
			serverUrl: readOptionalString(patch, 'serverUrl') ?? current.serverUrl,
			authorization: readOptionalString(patch, 'authorization') ?? current.authorization,
			requireApproval: readOptionalApprovalMode(patch, 'requireApproval') ?? current.requireApproval,
			allowedTools: readOptionalStringArray(patch, 'allowedTools') ?? current.allowedTools,
			deferLoading: readOptionalBoolean(patch, 'deferLoading') ?? current.deferLoading,
			enabled: readOptionalBoolean(patch, 'enabled') ?? current.enabled,
			mcp: readOptionalMcp(patch, 'mcp') ?? current.mcp,
		});
		const base: ConnectorConfig = {
			...current,
			...merged,
			serverUrl: merged.serverUrl,
			authorization: merged.authorization ?? '',
			mcp: cloneValue(merged.mcp),
			tools: [],
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		};
		const next: ConnectorConfig = {
			...base,
			tools: isOpenAiResponsesConnector(base)
				? openAiResponsesConnectorTools(base)
				: applyToolPolicy(current.tools, base.allowedTools, base.requireApproval),
		};
		this.replace(next);
		return redactConnectorSecrets(next);
	}

	async remove(id: string): Promise<void> {
		this.writeConnectors(this.validConnectors().filter((connector) => connector.id !== id));
	}

	async enable(id: string): Promise<ConnectorConfig> {
		const connector = { ...this.getStored(id), enabled: true, updatedAt: new Date().toISOString() };
		this.replace(connector);
		return redactConnectorSecrets(connector);
	}

	async disable(id: string): Promise<ConnectorConfig> {
		const connector = { ...this.getStored(id), enabled: false, updatedAt: new Date().toISOString() };
		this.replace(connector);
		return redactConnectorSecrets(connector);
	}

	async test(id: string): Promise<ConnectorTestResult> {
		const connector = this.getStored(id);
		const status = toStatus(connector, this.env());
		if (status === 'configured') return { status, message: 'Connector is configured.' };
		if (status === 'missing_auth') return { status, message: 'Connector credentials are missing.' };
		if (status === 'disabled') return { status, message: 'Connector is disabled.' };
		return { status, message: connector.lastError ?? 'Connector has a configuration error.' };
	}

	async reconnect(id: string): Promise<ConnectorTestResult> {
		await this.refreshTools(id);
		return this.test(id);
	}

	async authorizeOAuth(input: ConnectorOAuthAuthorizeRequest | string): Promise<ConnectorOAuthAuthorizeResult> {
		const connectorId = typeof input === 'string' ? input : input.connectorId;
		throw new Error(`OAuth connector catalog authorization is not available: ${connectorId}`);
	}

	async connectOAuth(id: string): Promise<ConnectorOAuthAuthorizeResult | ConnectorOAuthConnectResult> {
		return this.authorizeOAuth({ connectorId: id });
	}

	completeOAuth(input: ConnectorOAuthCompleteInput): ConnectorConfig {
		const state = typeof input.state === 'string' ? input.state : '';
		const connector = this.validConnectors().find((item) => item.oauth?.state === state);
		if (!connector) throw new Error('OAuth state was not found.');
		if (!connector.oauth) throw new Error('OAuth state was not found.');
		const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000).toISOString() : undefined;
		const next: ConnectorConfig = {
			...connector,
			oauth: {
				...connector.oauth,
				redirectUri: connector.oauth.redirectUri,
				accountEmail: input.accountEmail,
				token: {
					accessToken: input.accessToken,
					refreshToken: input.refreshToken,
					tokenType: input.tokenType,
					scope: input.scope,
					expiresAt,
				},
			},
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		};
		this.replace(next);
		return redactConnectorSecrets(next);
	}

	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.getStored(id);
		if (isOpenAiResponsesConnector(connector)) {
			const next = {
				...withOpenAiResponsesConnectorTools(connector),
				lastRefreshedAt: new Date().toISOString(),
			};
			this.replace(next);
			return next.tools;
		}
		assertMcpSecrets(connector, this.env());
		const next = await this.withDiscoveredTools(connector, false);
		this.replace(next);
		return next.tools;
	}

	listTools(id: string): ConnectorTool[] {
		return this.getStored(id).tools;
	}

	getConnectorSettings(): ConnectorConfig[] {
		return this.validConnectors().map(redactConnectorSecrets);
	}

	async callTool(id?: unknown, name?: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		const connectorId = requireString(id, 'Connector id');
		const toolName = requireString(name, 'Connector tool name');
		const toolArgs = readToolArgs(args);
		const toolOptions = readToolOptions(options);
		const connector = this.getStored(connectorId);
		const status = toStatus(connector, this.env());
		if (status !== 'configured') throw new Error(`Connector is not configured: ${connector.name}`);
		if (isOpenAiResponsesConnector(connector)) {
			throw new Error('OpenAI connector tools are executed by OpenAI Responses API.');
		}
		const tool = connector.tools.find((item) => item.name === toolName);
		if (!tool) throw new Error(`Tool ${toolName} is not enabled for ${connector.name}.`);
		if (tool.permission === 'blocked') throw new Error(`Tool ${toolName} is blocked for ${connector.name}.`);
		const client = this.mcpClient(connector);
		try {
			return await client.callTool(toolName, toolArgs, toolOptions);
		} finally {
			await client.close?.();
		}
	}

	async listResources(id: unknown): Promise<unknown> {
		const client = this.mcpClient(this.getStored(requireString(id, 'Connector id')));
		try {
			return client.listResources ? client.listResources() : [];
		} finally {
			await client.close?.();
		}
	}

	async readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.getStored(requireString(id, 'Connector id')));
		try {
			if (!client.readResource) throw new Error('MCP resources are not supported by this connector.');
			return client.readResource(requireString(uri, 'MCP resource URI'), options);
		} finally {
			await client.close?.();
		}
	}

	async listPrompts(id: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.getStored(requireString(id, 'Connector id')));
		try {
			return client.listPrompts ? client.listPrompts(options) : [];
		} finally {
			await client.close?.();
		}
	}

	async getPrompt(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.getStored(requireString(id, 'Connector id')));
		try {
			if (!client.getPrompt) throw new Error('MCP prompts are not supported by this connector.');
			return client.getPrompt(requireString(name, 'MCP prompt name'), readToolArgs(args), options);
		} finally {
			await client.close?.();
		}
	}

	createAgentTools(): AgentTool[] {
		return this.validConnectors()
			.filter((connector) => connector.enabled && toStatus(connector, this.env()) === 'configured')
			.filter((connector) => !isOpenAiResponsesConnector(connector))
			.flatMap((connector) =>
				connector.tools
					.filter((tool) => tool.permission !== 'blocked')
					.map((tool) => ({
						name: agentToolNameFor(connector, tool.name),
						description: `${connector.name}: ${tool.description ?? tool.name}`,
						schema: (tool.inputSchema ?? { type: 'object' }) as AgentTool['schema'],
						needsApproval: (_args: unknown, _ctx: ToolContext) => tool.requiresApproval,
						execute: async (args: Record<string, unknown>) => {
							try {
								const payload = await this.callTool(connector.id, tool.name, args);
								return textResult(JSON.stringify(payload, null, 2));
							} catch (error) {
								return textResult(errorMessage(error), true);
							}
						},
					}))
			);
	}

	createOpenAIConnectorTools(): OpenAiMcpConnectorToolSpec[] {
		return this.validConnectors()
			.filter((connector) => connector.enabled && toStatus(connector, this.env()) === 'configured')
			.filter(isOpenAiResponsesConnector)
			.map(toOpenAiMcpTool);
	}

	private getStored(id: string): ConnectorConfig {
		const connector = this.validConnectors().find((item) => item.id === id);
		if (!connector) throw new Error(`Connector not found: ${id}`);
		return connector;
	}

	private validConnectors(): ConnectorConfig[] {
		try {
			const raw = this.store.get(CONNECTOR_STORE_KEY);
			if (raw === undefined) return [];
			if (!Array.isArray(raw)) {
				this.warn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY });
				return [];
			}
			const valid = raw.filter(isStoredConnectorValid).map(normalizeStoredConnector);
			if (valid.length !== raw.length) {
				this.warn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY });
			}
			return valid;
		} catch (error) {
			this.error('Failed to read connector settings', {
				key: CONNECTOR_STORE_KEY,
				error: errorMessage(error),
			});
			throw error;
		}
	}

	private writeConnectors(connectors: ConnectorConfig[]): void {
		this.store.set(CONNECTOR_STORE_KEY, connectors);
	}

	private replace(connector: ConnectorConfig): void {
		this.writeConnectors(
			this.validConnectors().map((item) => (item.id === connector.id ? connector : item))
		);
	}

	private async withDiscoveredTools(connector: ConnectorConfig, containFailure: boolean): Promise<ConnectorConfig> {
		try {
			const client = this.mcpClient(connector);
			try {
				const discovered = await client.listTools();
				return {
					...connector,
					tools: applyToolPolicy(discovered, connector.allowedTools, connector.requireApproval),
					lastError: undefined,
					lastRefreshedAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
			} finally {
				await client.close?.();
			}
		} catch (error) {
			if (!containFailure) throw error;
			return {
				...connector,
				lastError: errorMessage(error),
				updatedAt: new Date().toISOString(),
			};
		}
	}

	private mcpClient(connector: ConnectorConfig): ConnectorMcpClient {
		if (!connector.mcp) throw new Error('MCP transport configuration is required.');
		assertMcpSecrets(connector, this.env());
		if (this.options.mcpClientFactory) {
			return this.options.mcpClientFactory(connector, resolveMcpSecrets(connector, this.env()));
		}
		throw new Error('MCP client factory is not configured.');
	}

	private env(): NodeJS.ProcessEnv {
		return this.options.env ?? process.env;
	}

	private warn(message: string, details?: Record<string, unknown>): void {
		this.logger.warn('ConnectorsService', message, details);
	}

	private error(message: string, details?: Record<string, unknown>): void {
		this.logger.error('ConnectorsService', message, details);
	}
}

function resolveAppDataPath(): string {
	try {
		return app.getPath('appData');
	} catch {
		return process.env.HOME ?? process.cwd();
	}
}

function sanitizeInput(input: unknown): ConnectorInput {
	const raw = requireObject(input, 'Connector configuration');
	const name = readOptionalString(raw, 'name')?.trim() ?? '';
	const connectorId = readOptionalString(raw, 'connectorId')?.trim() ?? '';
	const serverLabel = readOptionalString(raw, 'serverLabel')?.trim() || serverLabelFromName(name);
	const serverUrl = readOptionalString(raw, 'serverUrl')?.trim() || undefined;
	const serverDescription = readOptionalString(raw, 'serverDescription')?.trim();
	const authorization = readOptionalString(raw, 'authorization')?.trim() ?? '';
	const requireApproval = readOptionalApprovalMode(raw, 'requireApproval') ?? 'always';
	const allowedTools = readOptionalStringArray(raw, 'allowedTools') ?? [];
	const deferLoading = readOptionalBoolean(raw, 'deferLoading') ?? false;
	const enabled = readOptionalBoolean(raw, 'enabled') ?? true;
	const mcp = readOptionalMcp(raw, 'mcp');
	const openAiResponsesConnector = !mcp || Boolean(serverUrl);

	if (!name) throw new Error('Connector name is required.');
	if (!connectorId) throw new Error('Connector id is required.');
	if (serverUrl) validateOpenAiServerUrl(serverUrl);
	if (serverUrl && mcp) throw new Error('Connector cannot define both serverUrl and local MCP configuration.');
	if (!serverLabel) throw new Error('Server label is required.');
	if (!/^[a-zA-Z0-9_-]+$/.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}
	if (authorization && !openAiResponsesConnector) {
		throw new Error('Connector authorization secrets must be referenced from environment variables.');
	}
	if (!openAiResponsesConnector) {
		if (!mcp) throw new Error('MCP transport configuration is required.');
		validateMcpConfig(mcp);
	}

	return {
		name,
		connectorId,
		serverLabel,
		serverDescription,
		serverUrl,
		authorization: openAiResponsesConnector ? authorization : '',
		requireApproval,
		allowedTools: uniqueStrings(allowedTools),
		deferLoading,
		enabled,
		mcp: openAiResponsesConnector ? undefined : mcp,
	};
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(`${label} is required.`);
}

function readOptionalString(params: Record<string, unknown>, key: string): string | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	return value;
}

function readOptionalBoolean(params: Record<string, unknown>, key: string): boolean | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean.`);
	return value;
}

function readOptionalStringArray(params: Record<string, unknown>, key: string): string[] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error(`${key} must be an array of strings.`);
	}
	return value.map((entry) => entry.trim()).filter(Boolean);
}

function readOptionalApprovalMode(
	params: Record<string, unknown>,
	key: string
): ConnectorApprovalMode | undefined {
	const value = readOptionalString(params, key);
	if (value === undefined) return undefined;
	if (value === 'always' || value === 'never' || value === 'never_for_allowed_tools') return value;
	throw new Error(`${key} must be one of: always, never, never_for_allowed_tools.`);
}

function readOptionalMcp(params: Record<string, unknown>, key: string): ConnectorInput['mcp'] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	return cloneValue(requireObject(value, key)) as unknown as ConnectorInput['mcp'];
}

function validateMcpConfig(mcp: ConnectorInput['mcp']): void {
	if (!mcp || typeof mcp !== 'object') throw new Error('MCP transport configuration is required.');
	if (mcp.transport === 'http') {
		const url = new URL(mcp.url);
		if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
			throw new Error('Remote MCP servers must use HTTPS unless local.');
		}
		for (const [key, value] of Object.entries(mcp.headers ?? {})) {
			if (isSecretHeader(key) && value.trim()) {
				throw new Error('MCP secret headers must be provided through environment variables.');
			}
		}
		return;
	}
	if (mcp.transport === 'stdio') {
		if (!path.isAbsolute(mcp.command)) throw new Error(`MCP command must be absolute: ${mcp.command}`);
		return;
	}
	throw new Error('Unsupported MCP transport configuration.');
}

function validateOpenAiServerUrl(serverUrl: string): void {
	const url = new URL(serverUrl);
	if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
		throw new Error('Remote MCP servers must use HTTPS unless local.');
	}
}

function isSecretHeader(key: string): boolean {
	return /(authorization|api[-_]?key|token|secret)/i.test(key);
}

function isStoredConnectorValid(value: unknown): value is ConnectorConfig {
	const connector = value as ConnectorConfig;
	return (
		typeof connector === 'object' &&
		connector !== null &&
		typeof connector.id === 'string' &&
		typeof connector.name === 'string' &&
		typeof connector.connectorId === 'string' &&
		typeof connector.serverLabel === 'string'
	);
}

function normalizeStoredConnector(connector: ConnectorConfig): ConnectorConfig {
	return {
		...connector,
		serverUrl: typeof connector.serverUrl === 'string' && connector.serverUrl.trim() ? connector.serverUrl.trim() : undefined,
		authorization: typeof connector.authorization === 'string' ? connector.authorization : '',
		allowedTools: Array.isArray(connector.allowedTools) ? uniqueStrings(connector.allowedTools) : [],
		requireApproval: connector.requireApproval ?? 'always',
		deferLoading: connector.deferLoading ?? false,
		enabled: connector.enabled ?? true,
		tools: Array.isArray(connector.tools) ? connector.tools.map(normalizeTool) : [],
	};
}

function normalizeTool(tool: ConnectorTool): ConnectorTool {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
		permission: tool.permission ?? 'always-allow',
		requiresApproval: tool.requiresApproval ?? false,
	};
}

function toView(connector: ConnectorConfig, env: NodeJS.ProcessEnv): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		authKind: authKindFor(connector),
		serverLabel: connector.serverLabel,
		serverUrl: connector.serverUrl,
		enabled: connector.enabled,
		status: toStatus(connector, env),
		requireApproval: connector.requireApproval,
		allowedToolsCount: connector.allowedTools.length,
		toolsCount: connector.tools.length,
		deferLoading: connector.deferLoading,
		lastRefreshedAt: connector.lastRefreshedAt,
		lastError: connector.lastError,
		connectedAccount: connector.oauth?.accountEmail ?? connector.oauth?.email,
	};
}

function authKindFor(connector: ConnectorConfig): ConnectorView['authKind'] {
	if (connector.oauth) return 'oauth';
	if (isOpenAiResponsesConnector(connector)) {
		return connector.serverUrl && !connectorAuthorization(connector) ? 'none' : 'manual_oauth_access_token';
	}
	if (requiredMcpSecretNames(connector).length > 0) return 'mcp_env';
	return 'mcp_env';
}

function toStatus(connector: ConnectorConfig, env: NodeJS.ProcessEnv): ConnectorStatus {
	if (!connector.enabled) return 'disabled';
	if (connector.lastError) return 'error';
	if (isOpenAiConnectorIdTool(connector) && !connectorAuthorization(connector)) return 'missing_auth';
	if (hasMissingMcpSecrets(connector, env)) return 'missing_auth';
	if (connector.oauth && !connector.oauth.token?.accessToken && !connector.oauth.token?.refreshToken) {
		return 'missing_auth';
	}
	return 'configured';
}

function applyToolPolicy(
	tools: readonly ConnectorTool[],
	allowedTools: readonly string[],
	requireApproval: ConnectorApprovalMode
): ConnectorTool[] {
	const allowed = new Set(allowedTools);
	return tools.map((tool) => {
		const blocked = allowed.size > 0 && !allowed.has(tool.name);
		if (blocked) return { ...normalizeTool(tool), permission: 'blocked', requiresApproval: false };
		if (allowed.size === 0 || requireApproval === 'never' || requireApproval === 'never_for_allowed_tools') {
			return { ...normalizeTool(tool), permission: 'always-allow', requiresApproval: false };
		}
		return { ...normalizeTool(tool), permission: 'needs-approval', requiresApproval: true };
	});
}

function requiredMcpSecretNames(connector: ConnectorConfig): string[] {
	const mcp = connector.mcp;
	if (!mcp) return [];
	if (mcp.transport === 'http') return mcp.auth?.env ? [mcp.auth.env] : [];
	if (mcp.transport === 'stdio') return (mcp.envSecrets ?? []).map((secret) => secret.env);
	return [];
}

function hasMissingMcpSecrets(connector: ConnectorConfig, env: NodeJS.ProcessEnv): boolean {
	return requiredMcpSecretNames(connector).some((name) => !env[name]);
}

function assertMcpSecrets(connector: ConnectorConfig, env: NodeJS.ProcessEnv): void {
	const missing = requiredMcpSecretNames(connector).filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(`Missing required MCP secret environment variables: ${missing.join(', ')}`);
	}
}

function resolveMcpSecrets(connector: ConnectorConfig, env: NodeJS.ProcessEnv): Record<string, string> {
	const secrets: Record<string, string> = {};
	for (const name of requiredMcpSecretNames(connector)) {
		const value = env[name];
		if (value) secrets[name] = value;
	}
	return secrets;
}

function redactConnectorSecrets(connector: ConnectorConfig): ConnectorConfig {
	if (!connector.oauth) return { ...connector, authorization: '' };
	const token = connector.oauth.token;
	return {
		...connector,
		authorization: '',
		oauth: {
			...connector.oauth,
			accessToken: connector.oauth.accessToken ? '' : undefined,
			refreshToken: connector.oauth.refreshToken ? '' : undefined,
			clientSecret: connector.oauth.clientSecret ? '' : undefined,
			token: token
				? {
						...token,
						accessToken: '',
						refreshToken: token.refreshToken ? '' : undefined,
					}
				: undefined,
		},
	};
}

function isOpenAiResponsesConnector(connector: Pick<ConnectorConfig, 'mcp' | 'serverUrl'>): boolean {
	return !connector.mcp || Boolean(connector.serverUrl);
}

function isOpenAiConnectorIdTool(connector: Pick<ConnectorConfig, 'mcp' | 'serverUrl'>): boolean {
	return isOpenAiResponsesConnector(connector) && !connector.serverUrl;
}

function openAiResponsesConnectorTools(connector: ConnectorConfig): ConnectorTool[] {
	const names = connector.tools.length > 0
		? connector.tools.map((tool) => tool.name)
		: connector.allowedTools;
	const tools = uniqueStrings(names).map((name) => ({
		name,
		description: name,
		inputSchema: { type: 'object' },
		permission: 'always-allow' as const,
		requiresApproval: false,
	}));
	return applyToolPolicy(tools, connector.allowedTools, connector.requireApproval);
}

function withOpenAiResponsesConnectorTools(connector: ConnectorConfig): ConnectorConfig {
	return {
		...connector,
		tools: openAiResponsesConnectorTools(connector),
		lastError: undefined,
		updatedAt: new Date().toISOString(),
	};
}

function connectorAuthorization(connector: ConnectorConfig): string {
	return (
		connector.authorization?.trim() ||
		connector.oauth?.token?.accessToken?.trim() ||
		connector.oauth?.accessToken?.trim() ||
		''
	);
}

function toOpenAiMcpTool(connector: ConnectorConfig): OpenAiMcpConnectorToolSpec {
	const authorization = connectorAuthorization(connector);
	const tool: OpenAiMcpConnectorToolSpec = {
		type: 'mcp',
		server_label: connector.serverLabel,
		require_approval: toOpenAiRequireApproval(connector.requireApproval, connector.allowedTools),
	};
	if (connector.serverUrl) {
		tool.server_url = connector.serverUrl;
		if (authorization) tool.authorization = authorization;
	} else {
		tool.connector_id = connector.connectorId;
		tool.authorization = authorization;
	}
	if (connector.allowedTools.length > 0) tool.allowed_tools = [...connector.allowedTools];
	if (connector.deferLoading) tool.defer_loading = true;
	if (connector.serverDescription) tool.server_description = connector.serverDescription;
	return tool;
}

function toOpenAiRequireApproval(
	mode: ConnectorApprovalMode,
	allowedTools: readonly string[]
): OpenAiConnectorRequireApproval {
	if (mode === 'always') return 'always';
	if (mode === 'never') return 'never';
	return { never: { tool_names: [...allowedTools] } };
}

function readToolArgs(value: unknown): Record<string, unknown> {
	if (value === undefined || value === null) return {};
	if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
	throw new Error('Connector tool arguments must be an object.');
}

function readToolOptions(value: unknown): ConnectorCallToolOptions | undefined {
	if (value === undefined || value === null) return undefined;
	const options = requireObject(value, 'Connector tool options');
	for (const key of ['timeoutMs', 'retries'] as const) {
		const item = options[key];
		if (
			item !== undefined &&
			(!Number.isInteger(item) || typeof item !== 'number' || item < 0)
		) {
			throw new Error(`Connector tool option ${key} must be a non-negative integer.`);
		}
	}
	return options;
}

function requireString(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${label} is required.`);
	return trimmed;
}

function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function agentToolNameFor(connector: ConnectorConfig, toolName: string): string {
	return `${connector.serverLabel}_${toolName}`
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function uniqueStrings(values: readonly string[]): string[] {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function cloneValue<T>(value: T): T {
	if (value === undefined || value === null) return value;
	return JSON.parse(JSON.stringify(value)) as T;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
