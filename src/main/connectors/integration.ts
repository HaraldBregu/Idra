import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import type { JSONSchema } from '../provider/types';
import type { AgentTool, AgentToolResult, ToolContext } from '../tools/types';

export type ConnectorType = 'mcp' | 'oauth' | 'apiKey' | 'internal' | 'local';
export type ConnectorAuthStatus = 'notConfigured' | 'authorized' | 'expired' | 'revoked' | 'missingScopes' | 'error';
export type ConnectorTrustLevel = 'firstParty' | 'verifiedThirdParty' | 'userInstalled' | 'unknown' | 'experimental';
export type DataSensitivity = 'public' | 'internal' | 'private' | 'restricted' | 'secret';
export type ConnectorHealthStatus = 'unknown' | 'healthy' | 'degraded' | 'unhealthy' | 'disabled';
export type ConnectorPermissionLevel =
	| 'none'
	| 'readMetadata'
	| 'readPrivate'
	| 'writeDraft'
	| 'writePrivate'
	| 'writeExternal'
	| 'delete'
	| 'admin';
export type ConnectorSafetyLevel = 'safe' | 'sensitive' | 'external' | 'destructive' | 'admin';
export type ConnectorActionType =
	| 'search'
	| 'read'
	| 'draft'
	| 'create'
	| 'update'
	| 'delete'
	| 'sendMessage'
	| 'publicPost'
	| 'purchase'
	| 'admin';
export type ConnectorReadWrite = 'read' | 'write';

const PERMISSION_RANK: Record<ConnectorPermissionLevel, number> = {
	none: 0,
	readMetadata: 1,
	readPrivate: 2,
	writeDraft: 3,
	writePrivate: 4,
	writeExternal: 5,
	delete: 6,
	admin: 7,
};

const SENSITIVITY_RANK: Record<DataSensitivity, number> = {
	public: 0,
	internal: 1,
	private: 2,
	restricted: 3,
	secret: 4,
};

export interface ConnectorRateLimit {
	perMinute?: number;
	perHour?: number;
	perDay?: number;
	costPerCall?: number;
	budgetPerUser?: number;
	budgetPerSession?: number;
}

export interface ConnectorRetryPolicy {
	retries: number;
	backoffMs: number;
}

export type McpServerConfig =
	| {
			transport: 'stdio';
			command: string;
			args?: string[];
			env?: Record<string, string>;
			cwd?: string;
			sandbox?: boolean;
	  }
	| {
			transport: 'http' | 'sse';
			url: string;
			headers?: Record<string, string>;
			auth?: { type: 'none' | 'bearerRef' | 'apiKeyRef' | 'oauthRef'; credentialRef?: string; headerName?: string };
	  }
	| {
			transport: 'local';
			command?: string;
			args?: string[];
			env?: Record<string, string>;
			cwd?: string;
			url?: string;
			sandbox?: boolean;
	  };

export interface ConnectorDefinition {
	id: string;
	name: string;
	provider: string;
	type: ConnectorType;
	description: string;
	enabled: boolean;
	authStatus: ConnectorAuthStatus;
	scopes: string[];
	permissions: ConnectorPermissionLevel[];
	baseUrl?: string;
	mcpServerConfig?: McpServerConfig;
	ownerUserId?: string;
	workspaceId?: string;
	trustLevel: ConnectorTrustLevel;
	dataSensitivity: DataSensitivity;
	rateLimit: ConnectorRateLimit;
	healthStatus: ConnectorHealthStatus;
	createdAt: string;
	updatedAt: string;
	metadata: Record<string, unknown>;
}

export type ConnectorPatch = Partial<
	Omit<ConnectorDefinition, 'id' | 'createdAt' | 'updatedAt'>
>;

export interface McpToolDescriptor {
	name: string;
	description?: string;
	inputSchema?: JSONSchema;
	outputSchema?: JSONSchema;
	annotations?: Record<string, unknown>;
}

export interface McpResourceDescriptor {
	uri: string;
	name?: string;
	description?: string;
	mimeType?: string;
}

export interface McpServerInfo {
	name: string;
	version?: string;
	capabilities?: Record<string, unknown>;
}

export interface MCPClient {
	connect(config: McpServerConfig): Promise<void>;
	disconnect(): Promise<void>;
	listTools(): Promise<McpToolDescriptor[]>;
	listResources(): Promise<McpResourceDescriptor[]>;
	readResource(uri: string): Promise<unknown>;
	callTool(name: string, args: unknown): Promise<unknown>;
	getServerInfo(): Promise<McpServerInfo>;
	ping(): Promise<boolean>;
}

export interface ConnectorActionDescriptor {
	name: string;
	description: string;
	inputSchema: JSONSchema;
	outputSchema?: JSONSchema;
	requiredScopes?: string[];
	requiredPermissions?: ConnectorPermissionLevel[];
	actionType?: ConnectorActionType;
	readWrite?: ConnectorReadWrite;
	destructive?: boolean;
	externalVisibility?: boolean;
	dataSensitivity?: DataSensitivity;
	rateLimit?: ConnectorRateLimit;
	reviewed?: boolean;
	provenance?: Record<string, unknown>;
}

export interface NormalizedConnectorTool {
	id: string;
	connectorId: string;
	name: string;
	description: string;
	inputSchema: JSONSchema;
	outputSchema: JSONSchema;
	requiredScopes: string[];
	permissionsRequired: ConnectorPermissionLevel[];
	safetyLevel: ConnectorSafetyLevel;
	readWrite: ConnectorReadWrite;
	actionType: ConnectorActionType;
	destructive: boolean;
	externalVisibility: boolean;
	dataSensitivity: DataSensitivity;
	rateLimit?: ConnectorRateLimit;
	enabled: boolean;
	provenance: {
		source: 'mcp' | 'connector' | 'internal';
		connectorProvider: string;
		discoveredAt: string;
		originalName: string;
		schemaHash: string;
		reviewed: boolean;
		metadata?: Record<string, unknown>;
	};
}

export interface ConnectorToolManifest {
	connectorId: string;
	tools: NormalizedConnectorTool[];
	refreshedAt: string;
	schemaHash: string;
	staleAfter: string;
}

export interface ToolManifestDiff {
	connectorId: string;
	added: NormalizedConnectorTool[];
	removed: NormalizedConnectorTool[];
	changedSchemas: NormalizedConnectorTool[];
}

export type ConnectorErrorCode =
	| 'CONNECTOR_NOT_FOUND'
	| 'CONNECTOR_DISABLED'
	| 'CONNECTOR_UNHEALTHY'
	| 'TOOL_NOT_FOUND'
	| 'TOOL_DISABLED'
	| 'AUTH_REQUIRED'
	| 'AUTH_REVOKED'
	| 'INSUFFICIENT_SCOPES'
	| 'INSUFFICIENT_PERMISSION'
	| 'TRUST_BLOCKED'
	| 'CONFIRMATION_REQUIRED'
	| 'CONFIRMATION_INVALID'
	| 'RATE_LIMITED'
	| 'BUDGET_EXCEEDED'
	| 'INPUT_VALIDATION_FAILED'
	| 'OUTPUT_VALIDATION_FAILED'
	| 'EXECUTION_FAILED'
	| 'TIMEOUT';

export class ConnectorError extends Error {
	constructor(
		readonly code: ConnectorErrorCode,
		message: string,
		readonly retryable = false,
		readonly details?: Record<string, unknown>
	) {
		super(message);
		this.name = 'ConnectorError';
	}
}

function nowIso(): string {
	return new Date().toISOString();
}

function stableHash(value: unknown): string {
	return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value as Record<string, unknown>)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}

function normalizeId(value: string): string {
	return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

function toolId(connectorId: string, toolName: string): string {
	return `${connectorId}:${normalizeId(toolName)}`;
}

function maxSensitivity(a: DataSensitivity, b: DataSensitivity): DataSensitivity {
	return SENSITIVITY_RANK[a] >= SENSITIVITY_RANK[b] ? a : b;
}

function permissionAllows(granted: ConnectorPermissionLevel[], required: ConnectorPermissionLevel): boolean {
	if (required === 'none') return true;
	if (granted.includes('admin')) return true;
	return granted.some((permission) => PERMISSION_RANK[permission] >= PERMISSION_RANK[required]);
}

function highestPermission(permissions: ConnectorPermissionLevel[]): ConnectorPermissionLevel {
	return permissions.reduce<ConnectorPermissionLevel>((highest, current) => {
		return PERMISSION_RANK[current] > PERMISSION_RANK[highest] ? current : highest;
	}, 'none');
}

function inferActionType(name: string): ConnectorActionType {
	const lower = name.toLowerCase();
	if (/(delete|remove|destroy|purge)/.test(lower)) return 'delete';
	if (/(send|message)/.test(lower)) return 'sendMessage';
	if (/(post|publish|issue|share)/.test(lower)) return 'publicPost';
	if (/(buy|purchase|order)/.test(lower)) return 'purchase';
	if (/(draft|compose)/.test(lower)) return 'draft';
	if (/(create|add|new)/.test(lower)) return 'create';
	if (/(update|edit|patch|write)/.test(lower)) return 'update';
	if (/(admin|settings|permission)/.test(lower)) return 'admin';
	return /(search|list|find)/.test(lower) ? 'search' : 'read';
}

function inferPermission(actionType: ConnectorActionType): ConnectorPermissionLevel {
	switch (actionType) {
		case 'search':
			return 'readMetadata';
		case 'read':
			return 'readPrivate';
		case 'draft':
			return 'writeDraft';
		case 'create':
		case 'update':
			return 'writePrivate';
		case 'sendMessage':
		case 'publicPost':
		case 'purchase':
			return 'writeExternal';
		case 'delete':
			return 'delete';
		case 'admin':
			return 'admin';
	}
}

function isExternallyVisibleAction(actionType: ConnectorActionType): boolean {
	return actionType === 'sendMessage' || actionType === 'publicPost' || actionType === 'purchase';
}

function isDestructiveAction(actionType: ConnectorActionType): boolean {
	return actionType === 'delete';
}

function safetyLevelFor(
	actionType: ConnectorActionType,
	permission: ConnectorPermissionLevel,
	externalVisibility: boolean,
	destructive: boolean
): ConnectorSafetyLevel {
	if (permission === 'admin') return 'admin';
	if (destructive || actionType === 'delete') return 'destructive';
	if (externalVisibility || permission === 'writeExternal') return 'external';
	if (permission === 'readPrivate' || permission === 'writePrivate' || permission === 'writeDraft') return 'sensitive';
	return 'safe';
}

function requiresExplicitConfirmation(tool: NormalizedConnectorTool): boolean {
	const permission = highestPermission(tool.permissionsRequired);
	return (
		permission === 'writeExternal' ||
		permission === 'delete' ||
		permission === 'admin' ||
		tool.actionType === 'purchase' ||
		tool.actionType === 'publicPost' ||
		tool.actionType === 'sendMessage' ||
		tool.externalVisibility ||
		tool.destructive
	);
}

function copyConnector(connector: ConnectorDefinition): ConnectorDefinition {
	return {
		...connector,
		scopes: [...connector.scopes],
		permissions: [...connector.permissions],
		rateLimit: { ...connector.rateLimit },
		mcpServerConfig: connector.mcpServerConfig ? { ...connector.mcpServerConfig } : undefined,
		metadata: { ...connector.metadata },
	};
}

function validateConnector(connector: ConnectorDefinition): void {
	if (!connector.id.trim()) throw new ConnectorError('CONNECTOR_NOT_FOUND', 'Connector id is required.');
	if (!connector.name.trim()) throw new ConnectorError('CONNECTOR_NOT_FOUND', 'Connector name is required.');
	if (connector.mcpServerConfig) validateMcpServerConfig(connector.mcpServerConfig);
}

export function validateMcpServerConfig(config: McpServerConfig): void {
	if (config.transport === 'stdio' || config.transport === 'local') {
		if (config.command) {
			if (!path.isAbsolute(config.command)) {
				throw new ConnectorError('INPUT_VALIDATION_FAILED', `MCP command must be absolute: ${config.command}`);
			}
			if (/[\n\r;&|`$<>]/.test(config.command)) {
				throw new ConnectorError('INPUT_VALIDATION_FAILED', `MCP command contains unsafe shell characters.`);
			}
		}
		if (config.env) {
			for (const [key, value] of Object.entries(config.env)) {
				if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
					throw new ConnectorError('INPUT_VALIDATION_FAILED', `Unsafe MCP environment variable name: ${key}`);
				}
				if (/[\n\r]/.test(value)) {
					throw new ConnectorError('INPUT_VALIDATION_FAILED', `Unsafe MCP environment variable value for ${key}`);
				}
			}
		}
	}

	if (config.transport === 'http' || config.transport === 'sse') {
		const url = new URL(config.url);
		if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
			throw new ConnectorError('INPUT_VALIDATION_FAILED', 'Remote MCP servers must use HTTPS unless local.');
		}
	}
}

export class ConnectorRegistry {
	private readonly connectors = new Map<string, ConnectorDefinition>();

	constructor(
		initialConnectors: ConnectorDefinition[] = [],
		private readonly healthProbe?: (connector: ConnectorDefinition) => Promise<ConnectorHealthStatus>
	) {
		for (const connector of initialConnectors) this.registerConnector(connector);
	}

	registerConnector(connector: ConnectorDefinition): ConnectorDefinition {
		validateConnector(connector);
		const now = nowIso();
		const next: ConnectorDefinition = {
			...copyConnector(connector),
			createdAt: connector.createdAt || now,
			updatedAt: connector.updatedAt || now,
		};
		this.connectors.set(connector.id, next);
		return copyConnector(next);
	}

	unregisterConnector(connectorId: string): void {
		this.connectors.delete(connectorId);
	}

	getConnector(connectorId: string): ConnectorDefinition | undefined {
		const connector = this.connectors.get(connectorId);
		return connector ? copyConnector(connector) : undefined;
	}

	listConnectors(): ConnectorDefinition[] {
		return Array.from(this.connectors.values()).map(copyConnector);
	}

	listEnabledConnectors(): ConnectorDefinition[] {
		return this.listConnectors().filter((connector) => connector.enabled);
	}

	updateConnector(connectorId: string, patch: ConnectorPatch): ConnectorDefinition {
		const current = this.connectors.get(connectorId);
		if (!current) throw new ConnectorError('CONNECTOR_NOT_FOUND', `Connector not found: ${connectorId}`);
		const next: ConnectorDefinition = {
			...current,
			...patch,
			scopes: patch.scopes ? [...patch.scopes] : current.scopes,
			permissions: patch.permissions ? [...patch.permissions] : current.permissions,
			rateLimit: patch.rateLimit ? { ...patch.rateLimit } : current.rateLimit,
			metadata: patch.metadata ? { ...patch.metadata } : current.metadata,
			updatedAt: nowIso(),
		};
		validateConnector(next);
		this.connectors.set(connectorId, next);
		return copyConnector(next);
	}

	disableConnector(connectorId: string): ConnectorDefinition {
		return this.updateConnector(connectorId, { enabled: false, healthStatus: 'disabled' });
	}

	enableConnector(connectorId: string): ConnectorDefinition {
		return this.updateConnector(connectorId, { enabled: true, healthStatus: 'unknown' });
	}

	async checkHealth(connectorId: string): Promise<ConnectorHealthStatus> {
		const connector = this.connectors.get(connectorId);
		if (!connector) throw new ConnectorError('CONNECTOR_NOT_FOUND', `Connector not found: ${connectorId}`);
		const healthStatus = connector.enabled
			? this.healthProbe
				? await this.healthProbe(copyConnector(connector))
				: connector.healthStatus === 'disabled'
					? 'unknown'
					: connector.healthStatus
			: 'disabled';
		this.updateConnector(connectorId, { healthStatus });
		return healthStatus;
	}
}

export class MockMCPClient implements MCPClient {
	private connected = false;
	private readonly transientFailures = new Map<string, number>();
	private tools: McpToolDescriptor[];

	constructor(
		private readonly options: {
			tools?: McpToolDescriptor[];
			resources?: McpResourceDescriptor[];
			resourceContents?: Record<string, unknown>;
			toolResponses?: Record<string, unknown | ((args: unknown) => unknown | Promise<unknown>)>;
			serverInfo?: McpServerInfo;
			pingOk?: boolean;
			failToolAttempts?: Record<string, number>;
		} = {}
	) {
		this.tools = [...(options.tools ?? [])];
		for (const [tool, failures] of Object.entries(options.failToolAttempts ?? {})) {
			this.transientFailures.set(tool, failures);
		}
	}

	setTools(tools: McpToolDescriptor[]): void {
		this.tools = [...tools];
	}

	async connect(_config: McpServerConfig): Promise<void> {
		this.connected = true;
	}

	async disconnect(): Promise<void> {
		this.connected = false;
	}

	async listTools(): Promise<McpToolDescriptor[]> {
		this.assertConnected();
		return [...this.tools];
	}

	async listResources(): Promise<McpResourceDescriptor[]> {
		this.assertConnected();
		return [...(this.options.resources ?? [])];
	}

	async readResource(uri: string): Promise<unknown> {
		this.assertConnected();
		return this.options.resourceContents?.[uri] ?? null;
	}

	async callTool(name: string, args: unknown): Promise<unknown> {
		this.assertConnected();
		const remainingFailures = this.transientFailures.get(name) ?? 0;
		if (remainingFailures > 0) {
			this.transientFailures.set(name, remainingFailures - 1);
			throw new ConnectorError('EXECUTION_FAILED', `Transient failure for ${name}`, true);
		}
		const response = this.options.toolResponses?.[name];
		if (typeof response === 'function') return response(args);
		return response ?? { ok: true, tool: name, args };
	}

	async getServerInfo(): Promise<McpServerInfo> {
		this.assertConnected();
		return this.options.serverInfo ?? { name: 'Mock MCP', version: '0.0.0' };
	}

	async ping(): Promise<boolean> {
		this.assertConnected();
		return this.options.pingOk ?? true;
	}

	private assertConnected(): void {
		if (!this.connected) throw new ConnectorError('EXECUTION_FAILED', 'MCP client is not connected.');
	}
}

export class ConnectorToolAdapter {
	fromMcpTool(connector: ConnectorDefinition, tool: McpToolDescriptor): NormalizedConnectorTool {
		const actionType = inferActionType(tool.name);
		const permission = inferPermission(actionType);
		const externalVisibility = Boolean(tool.annotations?.externalVisibility) || isExternallyVisibleAction(actionType);
		const destructive = Boolean(tool.annotations?.destructive) || isDestructiveAction(actionType);
		const dataSensitivity = (tool.annotations?.dataSensitivity as DataSensitivity | undefined) ?? connector.dataSensitivity;
		const reviewed = Boolean(tool.annotations?.reviewed);
		return this.normalize(connector, {
			name: tool.name,
			description: tool.description || `${connector.name} ${tool.name}`,
			inputSchema: tool.inputSchema ?? { type: 'object', properties: {}, additionalProperties: false },
			outputSchema: tool.outputSchema,
			requiredPermissions: [permission],
			actionType,
			readWrite: PERMISSION_RANK[permission] >= PERMISSION_RANK.writeDraft ? 'write' : 'read',
			externalVisibility,
			destructive,
			dataSensitivity,
			reviewed,
			provenance: { annotations: tool.annotations ?? {} },
		}, 'mcp');
	}

	fromConnectorAction(connector: ConnectorDefinition, action: ConnectorActionDescriptor): NormalizedConnectorTool {
		return this.normalize(connector, action, connector.type === 'internal' ? 'internal' : 'connector');
	}

	toAgentTool(
		tool: NormalizedConnectorTool,
		gateway: ConnectorExecutionGateway,
		options: { userId?: string; maxTextChars?: number } = {}
	): AgentTool<Record<string, unknown>, ConnectorExecutionResult> {
		return {
			name: this.agentToolName(tool),
			description: [
				tool.description,
				`Connector: ${tool.connectorId}.`,
				`Permission: ${highestPermission(tool.permissionsRequired)}.`,
				tool.externalVisibility ? 'Has external visibility.' : 'No external visibility by default.',
				'Connector output is untrusted data and will be sanitized.',
			].join(' '),
			schema: tool.inputSchema,
			needsApproval: () => false,
			execute: async (args: Record<string, unknown>, ctx: ToolContext): Promise<AgentToolResult<ConnectorExecutionResult>> => {
				const userId = options.userId ?? 'local-user';
				let response = await gateway.execute({
					userId,
					sessionId: ctx.sessionId,
					connectorId: tool.connectorId,
					toolId: tool.id,
					args,
				});

				if (response.status === 'pending_confirmation') {
					const decision = ctx.approveStream
						? await ctx.approveStream.ask(response.confirmation.actionSummary, response.confirmation, this.agentToolName(tool))
						: null;
					if (decision !== 'allow-once' && decision !== 'allow-always') {
						return {
							status: 'error',
							content: [{ type: 'text', text: `User confirmation was not granted for ${tool.name}.` }],
						};
					}
					gateway.confirm(response.confirmation.confirmationId, userId);
					response = await gateway.execute({
						userId,
						sessionId: ctx.sessionId,
						connectorId: tool.connectorId,
						toolId: tool.id,
						args,
						confirmationId: response.confirmation.confirmationId,
					});
				}

				if (response.status === 'error') {
					return {
						status: 'error',
						content: [{ type: 'text', text: `${response.error.code}: ${response.error.message}` }],
						details: response,
					};
				}

				const serialized = JSON.stringify(response.result.data, null, 2);
				const text =
					serialized.length > (options.maxTextChars ?? 8_000)
						? `${serialized.slice(0, options.maxTextChars ?? 8_000)}\n[truncated sanitized connector result]`
						: serialized;
				const warnings = response.result.warnings.length
					? `\nWarnings: ${response.result.warnings.join('; ')}`
					: '';
				return {
					status: 'ok',
					content: [{ type: 'text', text: `${text}${warnings}` }],
					details: response.result,
				};
			},
		};
	}

	agentToolName(tool: NormalizedConnectorTool): string {
		return `connector_${normalizeId(tool.connectorId)}_${normalizeId(tool.name)}`;
	}

	private normalize(
		connector: ConnectorDefinition,
		action: ConnectorActionDescriptor,
		source: NormalizedConnectorTool['provenance']['source']
	): NormalizedConnectorTool {
		const actionType = action.actionType ?? inferActionType(action.name);
		const permissionsRequired = action.requiredPermissions?.length
			? [...action.requiredPermissions]
			: [inferPermission(actionType)];
		const permission = highestPermission(permissionsRequired);
		const externalVisibility = action.externalVisibility ?? isExternallyVisibleAction(actionType);
		const destructive = action.destructive ?? isDestructiveAction(actionType);
		const readWrite = action.readWrite ?? (PERMISSION_RANK[permission] >= PERMISSION_RANK.writeDraft ? 'write' : 'read');
		const dataSensitivity = action.dataSensitivity ?? connector.dataSensitivity;
		const inputSchema = action.inputSchema ?? { type: 'object', properties: {}, additionalProperties: false };
		const outputSchema = action.outputSchema ?? { type: 'object' };
		const schemaHash = stableHash({ inputSchema, outputSchema, permissionsRequired, actionType });
		const reviewed = action.reviewed ?? false;
		const writeToolAllowed =
			readWrite === 'read' ||
			reviewed ||
			(connector.metadata.allowedWriteTools instanceof Array &&
				connector.metadata.allowedWriteTools.includes(action.name));

		return {
			id: toolId(connector.id, action.name),
			connectorId: connector.id,
			name: action.name,
			description: action.description,
			inputSchema,
			outputSchema,
			requiredScopes: [...(action.requiredScopes ?? [])],
			permissionsRequired,
			safetyLevel: safetyLevelFor(actionType, permission, externalVisibility, destructive),
			readWrite,
			actionType,
			destructive,
			externalVisibility,
			dataSensitivity,
			rateLimit: action.rateLimit,
			enabled: writeToolAllowed,
			provenance: {
				source,
				connectorProvider: connector.provider,
				discoveredAt: nowIso(),
				originalName: action.name,
				schemaHash,
				reviewed,
				metadata: action.provenance,
			},
		};
	}
}

export interface ConnectorToolProvider {
	listTools(connector: ConnectorDefinition): Promise<ConnectorActionDescriptor[]>;
	callTool(connector: ConnectorDefinition, toolName: string, args: unknown): Promise<unknown>;
}

export class ConnectorToolDiscovery {
	private readonly manifests = new Map<string, ConnectorToolManifest>();
	private readonly diffs = new Map<string, ToolManifestDiff>();
	private readonly clients = new Map<string, MCPClient>();
	private readonly toolById = new Map<string, NormalizedConnectorTool>();

	constructor(
		private readonly registry: ConnectorRegistry,
		private readonly adapter: ConnectorToolAdapter,
		private readonly providers: Map<string, ConnectorToolProvider> = new Map(),
		private readonly mcpClientFactory: (connector: ConnectorDefinition) => MCPClient = () => new MockMCPClient(),
		private readonly staleAfterMs = 5 * 60 * 1000
	) {}

	async refreshConnectorTools(connectorId: string): Promise<ConnectorToolManifest> {
		const connector = this.registry.getConnector(connectorId);
		if (!connector) throw new ConnectorError('CONNECTOR_NOT_FOUND', `Connector not found: ${connectorId}`);

		let tools: NormalizedConnectorTool[];
		if (connector.type === 'mcp') {
			const client = await this.getMcpClient(connector);
			const mcpTools = await client.listTools();
			tools = mcpTools.map((tool) => this.adapter.fromMcpTool(connector, tool));
		} else {
			const provider = this.providers.get(connector.id);
			if (!provider) {
				tools = [];
			} else {
				const actions = await provider.listTools(connector);
				tools = actions.map((action) => this.adapter.fromConnectorAction(connector, action));
			}
		}

		const previous = this.manifests.get(connectorId);
		if (previous) {
			const previousByName = new Map(previous.tools.map((tool) => [tool.name, tool]));
			tools = tools.map((tool) => {
				const old = previousByName.get(tool.name);
				if (!old) return tool;
				return old.provenance.schemaHash === tool.provenance.schemaHash
					? { ...tool, enabled: old.enabled || tool.enabled }
					: { ...tool, enabled: tool.readWrite === 'read' && tool.enabled };
			});
		}

		const manifest: ConnectorToolManifest = {
			connectorId,
			tools,
			refreshedAt: nowIso(),
			schemaHash: stableHash(tools.map((tool) => ({ id: tool.id, schemaHash: tool.provenance.schemaHash }))),
			staleAfter: new Date(Date.now() + this.staleAfterMs).toISOString(),
		};
		this.cacheConnectorToolManifest(connectorId, manifest);
		this.diffs.set(connectorId, diffManifests(connectorId, previous, manifest));
		return manifest;
	}

	async refreshAllConnectorTools(): Promise<ConnectorToolManifest[]> {
		const manifests: ConnectorToolManifest[] = [];
		for (const connector of this.registry.listEnabledConnectors()) {
			manifests.push(await this.refreshConnectorTools(connector.id));
		}
		return manifests;
	}

	cacheConnectorToolManifest(connectorId: string, manifest?: ConnectorToolManifest): ConnectorToolManifest {
		const next = manifest ?? this.manifests.get(connectorId);
		if (!next) throw new ConnectorError('TOOL_NOT_FOUND', `No tool manifest available for ${connectorId}`);
		this.manifests.set(connectorId, {
			...next,
			tools: next.tools.map((tool) => ({ ...tool, provenance: { ...tool.provenance } })),
		});
		for (const tool of next.tools) this.toolById.set(tool.id, tool);
		return next;
	}

	detectAddedTools(connectorId: string): NormalizedConnectorTool[] {
		return [...(this.diffs.get(connectorId)?.added ?? [])];
	}

	detectRemovedTools(connectorId: string): NormalizedConnectorTool[] {
		return [...(this.diffs.get(connectorId)?.removed ?? [])];
	}

	detectChangedSchemas(connectorId: string): NormalizedConnectorTool[] {
		return [...(this.diffs.get(connectorId)?.changedSchemas ?? [])];
	}

	listCachedTools(): NormalizedConnectorTool[] {
		return Array.from(this.toolById.values()).filter((tool) => tool.enabled);
	}

	getTool(toolIdValue: string): NormalizedConnectorTool | undefined {
		return this.toolById.get(toolIdValue);
	}

	isManifestStale(connectorId: string, at = new Date()): boolean {
		const manifest = this.manifests.get(connectorId);
		if (!manifest) return true;
		return Date.parse(manifest.staleAfter) <= at.getTime();
	}

	private async getMcpClient(connector: ConnectorDefinition): Promise<MCPClient> {
		const existing = this.clients.get(connector.id);
		if (existing) return existing;
		if (!connector.mcpServerConfig) {
			throw new ConnectorError('INPUT_VALIDATION_FAILED', `MCP connector ${connector.id} has no server config.`);
		}
		const client = this.mcpClientFactory(connector);
		await client.connect(connector.mcpServerConfig);
		this.clients.set(connector.id, client);
		return client;
	}
}

function diffManifests(
	connectorId: string,
	previous: ConnectorToolManifest | undefined,
	next: ConnectorToolManifest
): ToolManifestDiff {
	if (!previous) return { connectorId, added: next.tools, removed: [], changedSchemas: [] };
	const previousById = new Map(previous.tools.map((tool) => [tool.id, tool]));
	const nextById = new Map(next.tools.map((tool) => [tool.id, tool]));
	return {
		connectorId,
		added: next.tools.filter((tool) => !previousById.has(tool.id)),
		removed: previous.tools.filter((tool) => !nextById.has(tool.id)),
		changedSchemas: next.tools.filter((tool) => {
			const old = previousById.get(tool.id);
			return old ? old.provenance.schemaHash !== tool.provenance.schemaHash : false;
		}),
	};
}

export interface ConnectorAuthorizationRecord {
	userId: string;
	connectorId: string;
	status: Extract<ConnectorAuthStatus, 'authorized' | 'expired' | 'revoked' | 'missingScopes' | 'error'>;
	scopes: string[];
	expiresAt?: string;
	credentialRef?: string;
	refreshable?: boolean;
	workspaceId?: string;
}

export interface AuthorizationRequest {
	authorizationId: string;
	userId: string;
	connectorId: string;
	scopes: string[];
	status: 'pending';
	expiresAt: string;
}

export class ConnectorAuthManager {
	private readonly records = new Map<string, ConnectorAuthorizationRecord>();
	private readonly availableScopes = new Map<string, Set<string>>();
	private readonly toolScopes = new Map<string, string[]>();

	constructor(connectors: ConnectorDefinition[] = []) {
		for (const connector of connectors) this.setAvailableScopes(connector.id, connector.scopes);
	}

	hasAuthorization(userId: string, connectorId: string, requiredScopes: string[] = []): boolean {
		const record = this.records.get(this.key(userId, connectorId));
		if (requiredScopes.length === 0) return record?.status !== 'revoked';
		if (!record) return false;
		if (record.status === 'revoked') return false;
		if (record.status === 'expired') return false;
		if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return false;
		return requiredScopes.every((scope) => record.scopes.includes(scope));
	}

	requestAuthorization(userId: string, connectorId: string, scopes: string[]): AuthorizationRequest {
		const available = this.availableScopes.get(connectorId);
		if (available && scopes.some((scope) => !available.has(scope))) {
			throw new ConnectorError('INSUFFICIENT_SCOPES', `Connector ${connectorId} does not offer all requested scopes.`);
		}
		return {
			authorizationId: randomUUID(),
			userId,
			connectorId,
			scopes: [...scopes],
			status: 'pending',
			expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
		};
	}

	refreshAuthorization(userId: string, connectorId: string): ConnectorAuthorizationRecord {
		const record = this.records.get(this.key(userId, connectorId));
		if (!record) throw new ConnectorError('AUTH_REQUIRED', `No authorization for ${connectorId}.`);
		if (record.status === 'revoked') throw new ConnectorError('AUTH_REVOKED', `Authorization revoked for ${connectorId}.`);
		if (!record.refreshable && record.status === 'expired') {
			throw new ConnectorError('AUTH_REQUIRED', `Authorization expired for ${connectorId}.`);
		}
		const next: ConnectorAuthorizationRecord = {
			...record,
			status: 'authorized',
			expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		};
		this.records.set(this.key(userId, connectorId), next);
		return this.safeRecord(next);
	}

	revokeAuthorization(userId: string, connectorId: string): void {
		const key = this.key(userId, connectorId);
		const record = this.records.get(key);
		if (record) this.records.set(key, { ...record, status: 'revoked', credentialRef: undefined });
	}

	getAvailableScopes(connectorId: string): string[] {
		return Array.from(this.availableScopes.get(connectorId) ?? []);
	}

	validateScopes(connectorId: string, toolIdValue: string): boolean {
		const available = this.availableScopes.get(connectorId) ?? new Set<string>();
		const required = this.toolScopes.get(toolIdValue) ?? [];
		return required.every((scope) => available.has(scope));
	}

	setAuthorization(record: ConnectorAuthorizationRecord): void {
		this.records.set(this.key(record.userId, record.connectorId), this.safeRecord(record));
	}

	setAvailableScopes(connectorId: string, scopes: string[]): void {
		this.availableScopes.set(connectorId, new Set(scopes));
	}

	registerToolScopes(connectorId: string, toolIdValue: string, scopes: string[]): void {
		this.setAvailableScopes(connectorId, this.getAvailableScopes(connectorId));
		this.toolScopes.set(toolIdValue, [...scopes]);
	}

	private key(userId: string, connectorId: string): string {
		return `${userId}:${connectorId}`;
	}

	private safeRecord(record: ConnectorAuthorizationRecord): ConnectorAuthorizationRecord {
		return {
			userId: record.userId,
			connectorId: record.connectorId,
			status: record.status,
			scopes: [...record.scopes],
			expiresAt: record.expiresAt,
			credentialRef: record.credentialRef ? `ref:${stableHash(record.credentialRef).slice(0, 12)}` : undefined,
			refreshable: record.refreshable,
			workspaceId: record.workspaceId,
		};
	}
}

export interface TrustDecision {
	decision: 'allow' | 'requireConsent' | 'deny';
	reason?: string;
}

export class ConnectorTrustPolicy {
	evaluate(input: {
		connector: ConnectorDefinition;
		tool: NormalizedConnectorTool;
		dataSensitivity: DataSensitivity;
		explicitConsent?: boolean;
	}): TrustDecision {
		if (input.connector.trustLevel === 'firstParty' || input.connector.trustLevel === 'verifiedThirdParty') {
			return { decision: 'allow' };
		}
		if (input.connector.trustLevel === 'experimental' && !input.explicitConsent) {
			return { decision: 'requireConsent', reason: 'Experimental connectors are opt-in per task.' };
		}
		if (input.connector.trustLevel === 'unknown') {
			if (SENSITIVITY_RANK[input.dataSensitivity] >= SENSITIVITY_RANK.private && !input.explicitConsent) {
				return { decision: 'deny', reason: 'Unknown connectors cannot receive private data without explicit consent.' };
			}
			return { decision: 'requireConsent', reason: 'Unknown connector requires explicit consent.' };
		}
		if (input.connector.trustLevel === 'userInstalled') {
			if (SENSITIVITY_RANK[input.dataSensitivity] >= SENSITIVITY_RANK.restricted && !input.explicitConsent) {
				return { decision: 'requireConsent', reason: 'User-installed connector needs consent for restricted data.' };
			}
			return { decision: 'allow' };
		}
		return { decision: 'deny', reason: 'Unsupported connector trust level.' };
	}
}

const SECRET_KEY_RE = /(api[_-]?key|token|secret|password|credential|authorization|cookie|session)/i;

export class DataMinimizer {
	minimize(input: {
		args: unknown;
		schema: JSONSchema;
		connector: ConnectorDefinition;
		tool: NormalizedConnectorTool;
		explicitConsent?: boolean;
	}): { args: unknown; dataSentSensitivity: DataSensitivity; warnings: string[] } {
		const warnings: string[] = [];
		let args = keepSchemaFields(input.args, input.schema);
		args = redactSecrets(args);
		const dataSentSensitivity = inferSensitivityFromValue(args, input.tool.dataSensitivity);

		if (
			input.connector.trustLevel === 'unknown' &&
			SENSITIVITY_RANK[dataSentSensitivity] >= SENSITIVITY_RANK.private &&
			!input.explicitConsent
		) {
			throw new ConnectorError('TRUST_BLOCKED', 'Blocked private data transfer to unknown connector.');
		}

		if (stableStringify(args).length < stableStringify(input.args).length) {
			warnings.push('Connector input was minimized to schema-declared fields.');
		}
		return { args, dataSentSensitivity, warnings };
	}

	summarize(value: unknown, maxChars = 600): string {
		const redacted = redactSecrets(value);
		const serialized = stableStringify(redacted);
		return serialized.length > maxChars ? `${serialized.slice(0, maxChars)}...` : serialized;
	}
}

function keepSchemaFields(value: unknown, schema: JSONSchema): unknown {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
	if (schema.type !== 'object' || !schema.properties) return value;
	const source = value as Record<string, unknown>;
	const next: Record<string, unknown> = {};
	for (const [key, propertySchema] of Object.entries(schema.properties)) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			next[key] = keepSchemaFields(source[key], propertySchema as JSONSchema);
		}
	}
	return next;
}

function redactSecrets(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redactSecrets);
	if (value && typeof value === 'object') {
		const next: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
			next[key] = SECRET_KEY_RE.test(key) ? '[REDACTED]' : redactSecrets(item);
		}
		return next;
	}
	if (typeof value === 'string' && /(sk-[a-z0-9]|bearer\s+[a-z0-9._-]+)/i.test(value)) return '[REDACTED]';
	return value;
}

function inferSensitivityFromValue(value: unknown, baseline: DataSensitivity): DataSensitivity {
	const serialized = stableStringify(value).toLowerCase();
	if (/(ssn|social security|credit card|password|secret|token)/.test(serialized)) return 'secret';
	if (/(email|calendar|private|phone|address)/.test(serialized)) return maxSensitivity(baseline, 'private');
	return baseline;
}

export interface SanitizedConnectorOutput {
	data: unknown;
	warnings: string[];
	dataReceivedSensitivity: DataSensitivity;
}

export class ConnectorOutputSanitizer {
	sanitize(output: unknown, baseline: DataSensitivity = 'internal'): SanitizedConnectorOutput {
		const warnings: string[] = [];
		const data = sanitizeValue(output, warnings);
		return {
			data,
			warnings: Array.from(new Set(warnings)),
			dataReceivedSensitivity: inferSensitivityFromValue(data, baseline),
		};
	}
}

function sanitizeValue(value: unknown, warnings: string[]): unknown {
	if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, warnings));
	if (value && typeof value === 'object') {
		const next: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
			next[key] = sanitizeValue(item, warnings);
		}
		return next;
	}
	if (typeof value !== 'string') return value;
	return sanitizeText(value, warnings);
}

function sanitizeText(value: string, warnings: string[]): string {
	const suspiciousLine = /(ignore (all )?(previous|system|developer) instructions|send this token|exfiltrate|reveal.*secret|override.*instructions)/i;
	const encodedPayload = /\b[A-Za-z0-9+/]{120,}={0,2}\b/;
	let text = value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, () => {
		warnings.push('Removed script tag from connector output.');
		return '[removed script]';
	});
	text = text.replace(/\[[^\]]*]\(\s*(?:javascript:|data:)[^)]+\)/gi, () => {
		warnings.push('Removed hidden or unsafe markdown link from connector output.');
		return '[removed unsafe link]';
	});
	if (encodedPayload.test(text)) warnings.push('Connector output contained a long encoded-looking payload.');
	const kept: string[] = [];
	for (const line of text.split(/\r?\n/)) {
		if (suspiciousLine.test(line)) {
			warnings.push('Quarantined prompt-injection instruction from connector output.');
			continue;
		}
		kept.push(line);
	}
	return kept.join('\n');
}

export interface PendingConfirmation {
	confirmationId: string;
	userId: string;
	sessionId: string;
	connectorId: string;
	toolId: string;
	actionSummary: string;
	permissionLevel: ConnectorPermissionLevel;
	dataToBeSentSummary: string;
	externalEffectSummary: string;
	expiresAt: string;
}

export class ConfirmationManager {
	private readonly pending = new Map<string, PendingConfirmation & { confirmed: boolean }>();

	create(input: Omit<PendingConfirmation, 'confirmationId' | 'expiresAt'>, ttlMs = 5 * 60 * 1000): PendingConfirmation {
		const confirmation: PendingConfirmation = {
			...input,
			confirmationId: randomUUID(),
			expiresAt: new Date(Date.now() + ttlMs).toISOString(),
		};
		this.pending.set(confirmation.confirmationId, { ...confirmation, confirmed: false });
		return confirmation;
	}

	confirm(confirmationId: string, userId: string): boolean {
		const current = this.pending.get(confirmationId);
		if (!current || current.userId !== userId || Date.parse(current.expiresAt) <= Date.now()) return false;
		this.pending.set(confirmationId, { ...current, confirmed: true });
		return true;
	}

	consume(confirmationId: string, userId: string, connectorId: string, toolIdValue: string): boolean {
		const current = this.pending.get(confirmationId);
		if (
			!current ||
			!current.confirmed ||
			current.userId !== userId ||
			current.connectorId !== connectorId ||
			current.toolId !== toolIdValue ||
			Date.parse(current.expiresAt) <= Date.now()
		) {
			return false;
		}
		this.pending.delete(confirmationId);
		return true;
	}
}

export interface ConnectorAuditEntry {
	auditId: string;
	userId: string;
	sessionId: string;
	connectorId: string;
	connectorName: string;
	toolId: string;
	toolName: string;
	actionType: ConnectorActionType;
	permissionLevel: ConnectorPermissionLevel;
	sanitizedInputSummary: string;
	sanitizedOutputSummary: string;
	scopesUsed: string[];
	confirmationId?: string;
	success: boolean;
	errorCode?: ConnectorErrorCode;
	startedAt: string;
	finishedAt: string;
	durationMs: number;
	dataSentSensitivity: DataSensitivity;
	dataReceivedSensitivity: DataSensitivity;
}

export class ConnectorAuditLog {
	private readonly entries: Readonly<ConnectorAuditEntry>[] = [];

	append(entry: Omit<ConnectorAuditEntry, 'auditId'> & { auditId?: string }): ConnectorAuditEntry {
		const safe: ConnectorAuditEntry = Object.freeze({
			...entry,
			auditId: entry.auditId ?? randomUUID(),
			sanitizedInputSummary: this.scrub(entry.sanitizedInputSummary),
			sanitizedOutputSummary: this.scrub(entry.sanitizedOutputSummary),
		});
		this.entries.push(safe);
		return { ...safe };
	}

	list(): ConnectorAuditEntry[] {
		return this.entries.map((entry) => ({ ...entry }));
	}

	private scrub(value: string): string {
		return String(redactSecrets(value));
	}
}

export class ConnectorHealthMonitor {
	private readonly metrics = new Map<
		string,
		{
			totalCalls: number;
			failures: number;
			totalLatencyMs: number;
			lastSuccessfulCall?: string;
			lastFailedCall?: string;
			lastManifestRefresh?: string;
		}
	>();

	constructor(private readonly registry: ConnectorRegistry) {}

	async checkHealth(connectorId: string): Promise<ConnectorHealthStatus> {
		const health = await this.registry.checkHealth(connectorId);
		if (health === 'healthy') this.recordSuccess(connectorId, 0);
		if (health === 'unhealthy') this.recordFailure(connectorId, 0);
		return health;
	}

	recordSuccess(connectorId: string, latencyMs: number): void {
		const current = this.current(connectorId);
		this.metrics.set(connectorId, {
			...current,
			totalCalls: current.totalCalls + 1,
			totalLatencyMs: current.totalLatencyMs + latencyMs,
			lastSuccessfulCall: nowIso(),
		});
	}

	recordFailure(connectorId: string, latencyMs: number): void {
		const current = this.current(connectorId);
		this.metrics.set(connectorId, {
			...current,
			totalCalls: current.totalCalls + 1,
			failures: current.failures + 1,
			totalLatencyMs: current.totalLatencyMs + latencyMs,
			lastFailedCall: nowIso(),
		});
	}

	recordManifestRefresh(connectorId: string): void {
		this.metrics.set(connectorId, { ...this.current(connectorId), lastManifestRefresh: nowIso() });
	}

	getReliability(connectorId: string): { errorRate: number; averageLatencyMs: number; priorSuccessRate: number; lastSuccessfulCall?: string; lastFailedCall?: string } {
		const current = this.current(connectorId);
		const errorRate = current.totalCalls === 0 ? 0 : current.failures / current.totalCalls;
		return {
			errorRate,
			averageLatencyMs: current.totalCalls === 0 ? 0 : current.totalLatencyMs / current.totalCalls,
			priorSuccessRate: 1 - errorRate,
			lastSuccessfulCall: current.lastSuccessfulCall,
			lastFailedCall: current.lastFailedCall,
		};
	}

	private current(connectorId: string) {
		return (
			this.metrics.get(connectorId) ?? {
				totalCalls: 0,
				failures: 0,
				totalLatencyMs: 0,
			}
		);
	}
}

export interface RateLimitDecision {
	allowed: boolean;
	reason?: ConnectorErrorCode;
	retryAfterMs?: number;
}

export class ConnectorRateLimiter {
	private readonly counters = new Map<string, { count: number; resetAt: number }>();
	private readonly budgets = new Map<string, { cost: number; resetAt: number }>();

	constructor(
		private readonly defaults: {
			perUserPerMinute?: number;
			perSessionPerMinute?: number;
			perTurn?: number;
			budgetPerUser?: number;
			budgetPerSession?: number;
		} = {}
	) {}

	checkAndConsume(input: {
		connector: ConnectorDefinition;
		tool: NormalizedConnectorTool;
		userId: string;
		sessionId: string;
		turnId?: string;
	}): RateLimitDecision {
		const perMinute = input.tool.rateLimit?.perMinute ?? input.connector.rateLimit.perMinute;
		if (perMinute && !this.consume(`connector:${input.connector.id}`, perMinute, 60_000)) {
			return { allowed: false, reason: 'RATE_LIMITED', retryAfterMs: this.retryAfter(`connector:${input.connector.id}`) };
		}
		if (this.defaults.perUserPerMinute && !this.consume(`user:${input.userId}`, this.defaults.perUserPerMinute, 60_000)) {
			return { allowed: false, reason: 'RATE_LIMITED', retryAfterMs: this.retryAfter(`user:${input.userId}`) };
		}
		if (this.defaults.perSessionPerMinute && !this.consume(`session:${input.sessionId}`, this.defaults.perSessionPerMinute, 60_000)) {
			return { allowed: false, reason: 'RATE_LIMITED', retryAfterMs: this.retryAfter(`session:${input.sessionId}`) };
		}
		if (this.defaults.perTurn && !this.consume(`turn:${input.turnId ?? input.sessionId}`, this.defaults.perTurn, 24 * 60 * 60_000)) {
			return { allowed: false, reason: 'RATE_LIMITED' };
		}

		const cost = input.tool.rateLimit?.costPerCall ?? input.connector.rateLimit.costPerCall ?? 1;
		if (!this.consumeBudget(`budget:user:${input.userId}`, cost, this.defaults.budgetPerUser ?? input.connector.rateLimit.budgetPerUser)) {
			return { allowed: false, reason: 'BUDGET_EXCEEDED' };
		}
		if (!this.consumeBudget(`budget:session:${input.sessionId}`, cost, this.defaults.budgetPerSession ?? input.connector.rateLimit.budgetPerSession)) {
			return { allowed: false, reason: 'BUDGET_EXCEEDED' };
		}

		return { allowed: true };
	}

	resetTurn(turnId: string): void {
		this.counters.delete(`turn:${turnId}`);
	}

	private consume(key: string, limit: number, windowMs: number): boolean {
		const now = Date.now();
		const current = this.counters.get(key);
		if (!current || current.resetAt <= now) {
			this.counters.set(key, { count: 1, resetAt: now + windowMs });
			return true;
		}
		if (current.count >= limit) return false;
		current.count += 1;
		return true;
	}

	private consumeBudget(key: string, cost: number, budget?: number): boolean {
		if (!budget) return true;
		const now = Date.now();
		const current = this.budgets.get(key);
		if (!current || current.resetAt <= now) {
			this.budgets.set(key, { cost, resetAt: now + 24 * 60 * 60_000 });
			return cost <= budget;
		}
		if (current.cost + cost > budget) return false;
		current.cost += cost;
		return true;
	}

	private retryAfter(key: string): number | undefined {
		const current = this.counters.get(key);
		return current ? Math.max(0, current.resetAt - Date.now()) : undefined;
	}
}

export interface ConnectorExecutionRequest {
	userId: string;
	sessionId: string;
	connectorId: string;
	toolId: string;
	args: unknown;
	confirmationId?: string;
	turnId?: string;
	sourceConnectorIds?: string[];
}

export interface ConnectorExecutionResult {
	connectorId: string;
	toolId: string;
	data: unknown;
	metadata: {
		auditId: string;
		provenance: NormalizedConnectorTool['provenance'];
		warnings: string[];
		dataSentSensitivity: DataSensitivity;
		dataReceivedSensitivity: DataSensitivity;
	};
	warnings: string[];
}

export type ConnectorExecutionResponse =
	| { status: 'ok'; result: ConnectorExecutionResult }
	| { status: 'pending_confirmation'; confirmation: PendingConfirmation }
	| { status: 'error'; error: ConnectorError };

export interface ConnectorExecutor {
	execute(connector: ConnectorDefinition, tool: NormalizedConnectorTool, args: unknown, signal: AbortSignal): Promise<unknown>;
}

export class ConnectorExecutionGateway {
	constructor(
		private readonly dependencies: {
			registry: ConnectorRegistry;
			discovery: ConnectorToolDiscovery;
			authManager: ConnectorAuthManager;
			trustPolicy: ConnectorTrustPolicy;
			dataMinimizer: DataMinimizer;
			outputSanitizer: ConnectorOutputSanitizer;
			auditLog: ConnectorAuditLog;
			confirmationManager: ConfirmationManager;
			healthMonitor: ConnectorHealthMonitor;
			rateLimiter: ConnectorRateLimiter;
			executor: ConnectorExecutor;
			timeoutMs?: number;
			retryPolicy?: ConnectorRetryPolicy;
		}
	) {}

	confirm(confirmationId: string, userId: string): boolean {
		return this.dependencies.confirmationManager.confirm(confirmationId, userId);
	}

	async execute(request: ConnectorExecutionRequest): Promise<ConnectorExecutionResponse> {
		const startedAt = nowIso();
		const startMs = Date.now();
		let connector: ConnectorDefinition | undefined;
		let tool: NormalizedConnectorTool | undefined;
		let sanitizedInputSummary = '';
		let sanitizedOutputSummary = '';
		let dataSentSensitivity: DataSensitivity = 'public';
		let dataReceivedSensitivity: DataSensitivity = 'public';
		let confirmationId = request.confirmationId;

		try {
			connector = this.dependencies.registry.getConnector(request.connectorId);
			if (!connector) throw new ConnectorError('CONNECTOR_NOT_FOUND', `Connector not found: ${request.connectorId}`);
			if (!connector.enabled) throw new ConnectorError('CONNECTOR_DISABLED', `Connector disabled: ${connector.name}`);
			if (connector.healthStatus === 'unhealthy' || connector.healthStatus === 'disabled') {
				throw new ConnectorError('CONNECTOR_UNHEALTHY', `Connector is not healthy: ${connector.name}`);
			}

			tool = this.dependencies.discovery.getTool(request.toolId);
			if (!tool) throw new ConnectorError('TOOL_NOT_FOUND', `Tool not found: ${request.toolId}`);
			if (!tool.enabled) throw new ConnectorError('TOOL_DISABLED', `Tool is disabled until reviewed: ${tool.name}`);

			if (request.sourceConnectorIds?.some((id) => id !== connector.id) && SENSITIVITY_RANK[tool.dataSensitivity] >= SENSITIVITY_RANK.private) {
				throw new ConnectorError('TRUST_BLOCKED', 'Private cross-connector data transfer requires explicit user approval.');
			}

			if (!this.dependencies.authManager.validateScopes(connector.id, tool.id)) {
				throw new ConnectorError('INSUFFICIENT_SCOPES', `Connector ${connector.name} is missing configured tool scopes.`);
			}
			if (!this.dependencies.authManager.hasAuthorization(request.userId, connector.id, tool.requiredScopes)) {
				throw new ConnectorError('AUTH_REQUIRED', `Authorization required for ${connector.name}.`);
			}

			for (const permission of tool.permissionsRequired) {
				if (!permissionAllows(connector.permissions, permission)) {
					throw new ConnectorError('INSUFFICIENT_PERMISSION', `Connector lacks ${permission} permission.`);
				}
			}

			const explicitConsent =
				Boolean(confirmationId) &&
				this.dependencies.confirmationManager.consume(confirmationId, request.userId, connector.id, tool.id);
			if (confirmationId && !explicitConsent) {
				throw new ConnectorError('CONFIRMATION_INVALID', 'Confirmation is invalid or expired.');
			}

			const minimized = this.dependencies.dataMinimizer.minimize({
				args: request.args,
				schema: tool.inputSchema,
				connector,
				tool,
				explicitConsent,
			});
			dataSentSensitivity = minimized.dataSentSensitivity;
			sanitizedInputSummary = this.dependencies.dataMinimizer.summarize(minimized.args);

			const trust = this.dependencies.trustPolicy.evaluate({
				connector,
				tool,
				dataSensitivity: dataSentSensitivity,
				explicitConsent,
			});
			if (trust.decision === 'deny') throw new ConnectorError('TRUST_BLOCKED', trust.reason ?? 'Connector trust policy denied use.');

			if ((requiresExplicitConfirmation(tool) || trust.decision === 'requireConsent') && !explicitConsent) {
				const confirmation = this.dependencies.confirmationManager.create({
					userId: request.userId,
					sessionId: request.sessionId,
					connectorId: connector.id,
					toolId: tool.id,
					actionSummary: `${connector.name}: ${tool.description}`,
					permissionLevel: highestPermission(tool.permissionsRequired),
					dataToBeSentSummary: sanitizedInputSummary,
					externalEffectSummary: tool.externalVisibility
						? `${tool.name} may create an externally visible effect.`
						: trust.reason ?? `${tool.name} requires user consent.`,
				});
				return { status: 'pending_confirmation', confirmation };
			}
			confirmationId = request.confirmationId;

			const validationErrors = validateJsonSchema(minimized.args, tool.inputSchema);
			if (validationErrors.length > 0) {
				throw new ConnectorError('INPUT_VALIDATION_FAILED', validationErrors.join('; '), false, { validationErrors });
			}

			const rateLimit = this.dependencies.rateLimiter.checkAndConsume({
				connector,
				tool,
				userId: request.userId,
				sessionId: request.sessionId,
				turnId: request.turnId,
			});
			if (!rateLimit.allowed) {
				throw new ConnectorError(rateLimit.reason ?? 'RATE_LIMITED', 'Connector rate limit or budget exceeded.', false, {
					retryAfterMs: rateLimit.retryAfterMs,
				});
			}

			const raw = await this.executeWithReliability(connector, tool, minimized.args);
			const outputValidation = validateJsonSchema(raw, tool.outputSchema);
			if (outputValidation.length > 0) {
				throw new ConnectorError('OUTPUT_VALIDATION_FAILED', outputValidation.join('; '), false, {
					validationErrors: outputValidation,
				});
			}
			const sanitized = this.dependencies.outputSanitizer.sanitize(raw, tool.dataSensitivity);
			dataReceivedSensitivity = sanitized.dataReceivedSensitivity;
			sanitizedOutputSummary = this.dependencies.dataMinimizer.summarize(sanitized.data);

			const audit = this.audit({
				userId: request.userId,
				sessionId: request.sessionId,
				connector,
				tool,
				startedAt,
				durationMs: Date.now() - startMs,
				sanitizedInputSummary,
				sanitizedOutputSummary,
				confirmationId,
				success: true,
				dataSentSensitivity,
				dataReceivedSensitivity,
			});
			this.dependencies.healthMonitor.recordSuccess(connector.id, Date.now() - startMs);

			return {
				status: 'ok',
				result: {
					connectorId: connector.id,
					toolId: tool.id,
					data: sanitized.data,
					warnings: [...minimized.warnings, ...sanitized.warnings],
					metadata: {
						auditId: audit.auditId,
						provenance: tool.provenance,
						warnings: [...minimized.warnings, ...sanitized.warnings],
						dataSentSensitivity,
						dataReceivedSensitivity,
					},
				},
			};
		} catch (error) {
			const connectorError = error instanceof ConnectorError
				? error
				: new ConnectorError('EXECUTION_FAILED', (error as Error).message, false);
			if (connector && tool) {
				this.audit({
					userId: request.userId,
					sessionId: request.sessionId,
					connector,
					tool,
					startedAt,
					durationMs: Date.now() - startMs,
					sanitizedInputSummary: sanitizedInputSummary || this.dependencies.dataMinimizer.summarize(request.args),
					sanitizedOutputSummary,
					confirmationId,
					success: false,
					errorCode: connectorError.code,
					dataSentSensitivity,
					dataReceivedSensitivity,
				});
				this.dependencies.healthMonitor.recordFailure(connector.id, Date.now() - startMs);
			}
			return { status: 'error', error: connectorError };
		}
	}

	private async executeWithReliability(
		connector: ConnectorDefinition,
		tool: NormalizedConnectorTool,
		args: unknown
	): Promise<unknown> {
		const retryPolicy = this.dependencies.retryPolicy ?? { retries: 1, backoffMs: 0 };
		let lastError: unknown;
		for (let attempt = 0; attempt <= retryPolicy.retries; attempt += 1) {
			const controller = new AbortController();
			const timeout = setTimeout(
				() => controller.abort(),
				this.dependencies.timeoutMs ?? Number(connector.metadata.timeoutMs ?? 30_000)
			);
			try {
				return await this.dependencies.executor.execute(connector, tool, args, controller.signal);
			} catch (error) {
				lastError = error;
				const retryable =
					(error instanceof ConnectorError && error.retryable) ||
					Boolean((error as { retryable?: boolean } | undefined)?.retryable);
				if (!retryable || attempt === retryPolicy.retries) break;
				if (retryPolicy.backoffMs > 0) await new Promise((resolve) => setTimeout(resolve, retryPolicy.backoffMs));
			} finally {
				clearTimeout(timeout);
			}
		}
		if (lastError instanceof ConnectorError) throw lastError;
		throw new ConnectorError('EXECUTION_FAILED', (lastError as Error).message);
	}

	private audit(input: {
		userId: string;
		sessionId: string;
		connector: ConnectorDefinition;
		tool: NormalizedConnectorTool;
		startedAt: string;
		durationMs: number;
		sanitizedInputSummary: string;
		sanitizedOutputSummary: string;
		confirmationId?: string;
		success: boolean;
		errorCode?: ConnectorErrorCode;
		dataSentSensitivity: DataSensitivity;
		dataReceivedSensitivity: DataSensitivity;
	}): ConnectorAuditEntry {
		return this.dependencies.auditLog.append({
			userId: input.userId,
			sessionId: input.sessionId,
			connectorId: input.connector.id,
			connectorName: input.connector.name,
			toolId: input.tool.id,
			toolName: input.tool.name,
			actionType: input.tool.actionType,
			permissionLevel: highestPermission(input.tool.permissionsRequired),
			sanitizedInputSummary: input.sanitizedInputSummary,
			sanitizedOutputSummary: input.sanitizedOutputSummary,
			scopesUsed: input.tool.requiredScopes,
			confirmationId: input.confirmationId,
			success: input.success,
			errorCode: input.errorCode,
			startedAt: input.startedAt,
			finishedAt: nowIso(),
			durationMs: input.durationMs,
			dataSentSensitivity: input.dataSentSensitivity,
			dataReceivedSensitivity: input.dataReceivedSensitivity,
		});
	}
}

function validateJsonSchema(value: unknown, schema: JSONSchema, prefix = 'value'): string[] {
	const errors: string[] = [];
	if (!schema || Object.keys(schema).length === 0) return errors;
	const type = schema.type;
	if (type && !matchesJsonType(value, type)) {
		errors.push(`${prefix} must be ${type}`);
		return errors;
	}
	if (schema.enum && !schema.enum.some((item) => stableStringify(item) === stableStringify(value))) {
		errors.push(`${prefix} must be one of ${schema.enum.map(String).join(', ')}`);
	}
	if (type === 'object' && schema.properties) {
		const obj = value as Record<string, unknown>;
		for (const required of schema.required ?? []) {
			if (!Object.prototype.hasOwnProperty.call(obj, required)) errors.push(`${prefix}.${required} is required`);
		}
		for (const [key, propertySchema] of Object.entries(schema.properties)) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				errors.push(...validateJsonSchema(obj[key], propertySchema as JSONSchema, `${prefix}.${key}`));
			}
		}
		if (schema.additionalProperties === false) {
			for (const key of Object.keys(obj)) {
				if (!Object.prototype.hasOwnProperty.call(schema.properties, key)) errors.push(`${prefix}.${key} is not allowed`);
			}
		}
	}
	if (type === 'array' && Array.isArray(value) && schema.items) {
		value.forEach((item, index) => {
			errors.push(...validateJsonSchema(item, schema.items as JSONSchema, `${prefix}[${index}]`));
		});
	}
	return errors;
}

function matchesJsonType(value: unknown, type: unknown): boolean {
	if (Array.isArray(type)) return type.some((item) => matchesJsonType(value, item));
	switch (type) {
		case 'object':
			return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
		case 'array':
			return Array.isArray(value);
		case 'string':
			return typeof value === 'string';
		case 'number':
			return typeof value === 'number' && Number.isFinite(value);
		case 'integer':
			return Number.isInteger(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'null':
			return value === null;
		default:
			return true;
	}
}

export class MockConnectorRuntime implements ConnectorToolProvider, ConnectorExecutor {
	private readonly actions = new Map<string, ConnectorActionDescriptor & { handler: (args: unknown) => unknown | Promise<unknown> }>();

	constructor(
		readonly definition: ConnectorDefinition,
		actions: Array<ConnectorActionDescriptor & { handler: (args: unknown) => unknown | Promise<unknown> }>
	) {
		for (const action of actions) this.actions.set(action.name, action);
	}

	async listTools(_connector: ConnectorDefinition): Promise<ConnectorActionDescriptor[]> {
		return Array.from(this.actions.values()).map(({ handler: _handler, ...action }) => action);
	}

	async callTool(_connector: ConnectorDefinition, toolName: string, args: unknown): Promise<unknown> {
		const action = this.actions.get(toolName);
		if (!action) throw new ConnectorError('TOOL_NOT_FOUND', `Tool not found: ${toolName}`);
		return action.handler(args);
	}

	async execute(connector: ConnectorDefinition, tool: NormalizedConnectorTool, args: unknown, _signal: AbortSignal): Promise<unknown> {
		return this.callTool(connector, tool.name, args);
	}
}

export class RuntimeConnectorExecutor implements ConnectorExecutor {
	constructor(private readonly runtimes: Map<string, MockConnectorRuntime>) {}

	async execute(connector: ConnectorDefinition, tool: NormalizedConnectorTool, args: unknown, signal: AbortSignal): Promise<unknown> {
		if (signal.aborted) throw new ConnectorError('TIMEOUT', 'Connector call aborted.', true);
		const runtime = this.runtimes.get(connector.id);
		if (!runtime) throw new ConnectorError('CONNECTOR_NOT_FOUND', `Runtime not registered for ${connector.id}`);
		return runtime.execute(connector, tool, args, signal);
	}
}

export class McpConnectorExecutor implements ConnectorExecutor {
	constructor(private readonly clients: Map<string, MCPClient>) {}

	async execute(connector: ConnectorDefinition, tool: NormalizedConnectorTool, args: unknown, signal: AbortSignal): Promise<unknown> {
		if (signal.aborted) throw new ConnectorError('TIMEOUT', 'MCP call aborted.', true);
		const client = this.clients.get(connector.id);
		if (!client) throw new ConnectorError('CONNECTOR_NOT_FOUND', `MCP client not registered for ${connector.id}`);
		return client.callTool(tool.name, args);
	}
}

export interface ToolRankingContext {
	userInput: string;
	userId: string;
	preferredConnectors?: string[];
	authorizedConnectorIds?: string[];
	dataSensitivity?: DataSensitivity;
}

export class ConnectorToolRanker {
	rankTools(
		tools: NormalizedConnectorTool[],
		connectors: ConnectorDefinition[],
		health: ConnectorHealthMonitor,
		context: ToolRankingContext
	): NormalizedConnectorTool[] {
		const connectorById = new Map(connectors.map((connector) => [connector.id, connector]));
		const tokens = tokenize(context.userInput);
		return [...tools]
			.map((tool) => {
				const connector = connectorById.get(tool.connectorId);
				const reliability = health.getReliability(tool.connectorId);
				let score = 0;
				score += tokens.filter((token) => tool.name.toLowerCase().includes(token) || tool.description.toLowerCase().includes(token)).length * 12;
				score += tool.readWrite === 'read' ? 8 : 0;
				score += tool.externalVisibility ? -12 : 0;
				score += tool.destructive ? -18 : 0;
				score += connector ? trustScore(connector.trustLevel) : -20;
				score += connector?.authStatus === 'authorized' || context.authorizedConnectorIds?.includes(tool.connectorId) ? 10 : -8;
				score += context.preferredConnectors?.includes(tool.connectorId) ? 12 : 0;
				score += reliability.priorSuccessRate * 8;
				score -= Math.min(reliability.averageLatencyMs / 1000, 10);
				score -= SENSITIVITY_RANK[tool.dataSensitivity] * 3;
				if (context.dataSensitivity && SENSITIVITY_RANK[context.dataSensitivity] > SENSITIVITY_RANK[tool.dataSensitivity]) score -= 4;
				return { tool, score };
			})
			.sort((a, b) => b.score - a.score)
			.map((item) => item.tool);
	}
}

function tokenize(value: string): string[] {
	return value.toLowerCase().split(/[^a-z0-9_]+/).filter((token) => token.length > 2);
}

function trustScore(level: ConnectorTrustLevel): number {
	switch (level) {
		case 'firstParty':
			return 20;
		case 'verifiedThirdParty':
			return 14;
		case 'userInstalled':
			return 4;
		case 'unknown':
			return -10;
		case 'experimental':
			return -14;
	}
}

export class ConnectorAgentIntegration {
	constructor(
		private readonly dependencies: {
			registry: ConnectorRegistry;
			discovery: ConnectorToolDiscovery;
			ranker: ConnectorToolRanker;
			healthMonitor: ConnectorHealthMonitor;
			authManager: ConnectorAuthManager;
			adapter: ConnectorToolAdapter;
			gateway: ConnectorExecutionGateway;
		}
	) {}

	async buildToolsForTurn(input: {
		userId: string;
		sessionId: string;
		userInput: string;
		dataSensitivity?: DataSensitivity;
		maxTools?: number;
		preferredConnectors?: string[];
	}): Promise<AgentTool[]> {
		for (const connector of this.dependencies.registry.listEnabledConnectors()) {
			if (this.dependencies.discovery.isManifestStale(connector.id)) {
				await this.dependencies.discovery.refreshConnectorTools(connector.id);
				this.dependencies.healthMonitor.recordManifestRefresh(connector.id);
			}
		}

		const connectors = this.dependencies.registry.listEnabledConnectors();
		const authorizedConnectorIds = connectors
			.filter((connector) => this.dependencies.authManager.hasAuthorization(input.userId, connector.id, []))
			.map((connector) => connector.id);
		const ranked = this.dependencies.ranker.rankTools(
			this.dependencies.discovery.listCachedTools().filter((tool) => {
				if (!tool.enabled) return false;
				if (tool.requiredScopes.length > 0 && !this.dependencies.authManager.hasAuthorization(input.userId, tool.connectorId, tool.requiredScopes)) {
					return false;
				}
				return true;
			}),
			connectors,
			this.dependencies.healthMonitor,
			{
				userId: input.userId,
				userInput: input.userInput,
				preferredConnectors: input.preferredConnectors,
				authorizedConnectorIds,
				dataSensitivity: input.dataSensitivity,
			}
		);

		return ranked.slice(0, input.maxTools ?? 8).map((tool) =>
			this.dependencies.adapter.toAgentTool(tool, this.dependencies.gateway, { userId: input.userId })
		);
	}
}

export interface ConnectorConfigEntry {
	id: string;
	provider: string;
	type: ConnectorType;
	displayName: string;
	description?: string;
	enabled: boolean;
	auth: { kind: 'none' } | { kind: 'oauth'; requiredScopes: string[] } | { kind: 'apiKey'; secretRef: string } | { kind: 'local'; credentialRef?: string };
	defaultScopes: string[];
	allowedPermissions: ConnectorPermissionLevel[];
	trustLevel: ConnectorTrustLevel;
	dataSensitivity: DataSensitivity;
	transport?: McpServerConfig;
	timeoutMs?: number;
	retryPolicy?: ConnectorRetryPolicy;
	rateLimit?: ConnectorRateLimit;
	toolAllowlist?: string[];
	toolBlocklist?: string[];
	metadata?: Record<string, unknown>;
}

export type ConnectorConfigFile = ConnectorConfigEntry[];

export class ConnectorConfigLoader {
	load(config: ConnectorConfigFile, workspaceId?: string): ConnectorDefinition[] {
		return config.map((entry) => {
			if (entry.transport) validateMcpServerConfig(entry.transport);
			const now = nowIso();
			return {
				id: entry.id,
				name: entry.displayName,
				provider: entry.provider,
				type: entry.type,
				description: entry.description ?? entry.displayName,
				enabled: entry.enabled,
				authStatus: entry.auth.kind === 'none' ? 'authorized' : 'notConfigured',
				scopes: [...entry.defaultScopes],
				permissions: [...entry.allowedPermissions],
				mcpServerConfig: entry.transport,
				workspaceId,
				trustLevel: entry.trustLevel,
				dataSensitivity: entry.dataSensitivity,
				rateLimit: entry.rateLimit ?? {},
				healthStatus: entry.enabled ? 'unknown' : 'disabled',
				createdAt: now,
				updatedAt: now,
				metadata: {
					...(entry.metadata ?? {}),
					timeoutMs: entry.timeoutMs,
					retryPolicy: entry.retryPolicy,
					toolAllowlist: entry.toolAllowlist,
					toolBlocklist: entry.toolBlocklist,
					authKind: entry.auth.kind,
					secretRef: entry.auth.kind === 'apiKey' ? entry.auth.secretRef : undefined,
				},
			};
		});
	}
}

export interface MemoryCandidate {
	key: string;
	value: unknown;
	sourceConnectorId?: string;
	dataSensitivity: DataSensitivity;
	userApproved?: boolean;
}

export class ConnectorMemoryPolicy {
	approve(candidate: MemoryCandidate): boolean {
		if (SECRET_KEY_RE.test(candidate.key) || containsSecret(candidate.value)) return false;
		if (SENSITIVITY_RANK[candidate.dataSensitivity] >= SENSITIVITY_RANK.private && !candidate.userApproved) return false;
		return true;
	}
}

function containsSecret(value: unknown): boolean {
	if (typeof value === 'string') return /(sk-[a-z0-9]|bearer\s+[a-z0-9._-]+|password|oauth|api key)/i.test(value);
	if (Array.isArray(value)) return value.some(containsSecret);
	if (value && typeof value === 'object') {
		return Object.entries(value as Record<string, unknown>).some(([key, item]) => SECRET_KEY_RE.test(key) || containsSecret(item));
	}
	return false;
}

function schema(properties: Record<string, JSONSchema>, required: string[] = []): JSONSchema {
	return { type: 'object', properties, required, additionalProperties: false };
}

function baseConnector(overrides: Partial<ConnectorDefinition> & Pick<ConnectorDefinition, 'id' | 'name' | 'provider' | 'type' | 'description'>): ConnectorDefinition {
	const now = nowIso();
	return {
		enabled: true,
		authStatus: 'authorized',
		scopes: [],
		permissions: ['readMetadata', 'readPrivate'],
		trustLevel: 'verifiedThirdParty',
		dataSensitivity: 'private',
		rateLimit: { perMinute: 60, costPerCall: 1 },
		healthStatus: 'healthy',
		createdAt: now,
		updatedAt: now,
		metadata: {},
		...overrides,
	};
}

export class GmailConnector extends MockConnectorRuntime {
	constructor() {
		super(
			baseConnector({
				id: 'gmail',
				name: 'Gmail',
				provider: 'google',
				type: 'oauth',
				description: 'Search, read, draft, send, and delete Gmail messages.',
				scopes: ['gmail.readonly', 'gmail.compose', 'gmail.send', 'gmail.modify'],
				permissions: ['readMetadata', 'readPrivate', 'writeDraft', 'writeExternal', 'delete'],
				metadata: { allowedWriteTools: ['draft'] },
			}),
			[
				{
					name: 'search',
					description: 'Search Gmail messages by query.',
					inputSchema: schema({ query: { type: 'string' } }, ['query']),
					requiredScopes: ['gmail.readonly'],
					requiredPermissions: ['readMetadata'],
					actionType: 'search',
					readWrite: 'read',
					reviewed: true,
					handler: (args) => ({ messages: [{ id: 'email_1', subject: `Result for ${(args as { query: string }).query}` }] }),
				},
				{
					name: 'read',
					description: 'Read a Gmail message by opaque id.',
					inputSchema: schema({ messageId: { type: 'string' } }, ['messageId']),
					requiredScopes: ['gmail.readonly'],
					requiredPermissions: ['readPrivate'],
					actionType: 'read',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ id: 'email_1', from: 'sender@example.com', body: 'Meeting notes and follow-up.' }),
				},
				{
					name: 'draft',
					description: 'Create a Gmail draft without sending it.',
					inputSchema: schema({ to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, ['to', 'subject', 'body']),
					requiredScopes: ['gmail.compose'],
					requiredPermissions: ['writeDraft'],
					actionType: 'draft',
					readWrite: 'write',
					reviewed: true,
					handler: () => ({ draftId: 'draft_1', status: 'created' }),
				},
				{
					name: 'send',
					description: 'Send a Gmail message externally.',
					inputSchema: schema({ to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, ['to', 'subject', 'body']),
					requiredScopes: ['gmail.send'],
					requiredPermissions: ['writeExternal'],
					actionType: 'sendMessage',
					readWrite: 'write',
					externalVisibility: true,
					reviewed: true,
					handler: () => ({ messageId: 'sent_1', status: 'sent' }),
				},
				{
					name: 'delete',
					description: 'Delete a Gmail message.',
					inputSchema: schema({ messageId: { type: 'string' } }, ['messageId']),
					requiredScopes: ['gmail.modify'],
					requiredPermissions: ['delete'],
					actionType: 'delete',
					readWrite: 'write',
					destructive: true,
					reviewed: true,
					handler: () => ({ deleted: true }),
				},
			]
		);
	}
}

export class GoogleCalendarConnector extends MockConnectorRuntime {
	constructor() {
		super(
			baseConnector({
				id: 'google_calendar',
				name: 'Google Calendar',
				provider: 'google',
				type: 'oauth',
				description: 'Read availability and manage calendar events.',
				scopes: ['calendar.readonly', 'calendar.events'],
				permissions: ['readMetadata', 'readPrivate', 'writePrivate', 'delete'],
				metadata: { allowedWriteTools: ['create', 'update'] },
			}),
			[
				{
					name: 'search',
					description: 'Search calendar events.',
					inputSchema: schema({ query: { type: 'string' } }),
					requiredScopes: ['calendar.readonly'],
					requiredPermissions: ['readMetadata'],
					actionType: 'search',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ events: [{ id: 'event_1', title: 'Planning' }] }),
				},
				{
					name: 'read',
					description: 'Read a calendar event.',
					inputSchema: schema({ eventId: { type: 'string' } }, ['eventId']),
					requiredScopes: ['calendar.readonly'],
					requiredPermissions: ['readPrivate'],
					actionType: 'read',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ id: 'event_1', title: 'Planning', attendees: ['user@example.com'] }),
				},
				{
					name: 'create',
					description: 'Create a private calendar event.',
					inputSchema: schema({ title: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' } }, ['title', 'start', 'end']),
					requiredScopes: ['calendar.events'],
					requiredPermissions: ['writePrivate'],
					actionType: 'create',
					readWrite: 'write',
					reviewed: true,
					handler: () => ({ eventId: 'event_new', status: 'created' }),
				},
				{
					name: 'update',
					description: 'Update a private calendar event.',
					inputSchema: schema({ eventId: { type: 'string' }, title: { type: 'string' } }, ['eventId']),
					requiredScopes: ['calendar.events'],
					requiredPermissions: ['writePrivate'],
					actionType: 'update',
					readWrite: 'write',
					reviewed: true,
					handler: () => ({ updated: true }),
				},
				{
					name: 'delete',
					description: 'Delete a calendar event.',
					inputSchema: schema({ eventId: { type: 'string' } }, ['eventId']),
					requiredScopes: ['calendar.events'],
					requiredPermissions: ['delete'],
					actionType: 'delete',
					readWrite: 'write',
					destructive: true,
					reviewed: true,
					handler: () => ({ deleted: true }),
				},
			]
		);
	}
}

export class GitHubConnector extends MockConnectorRuntime {
	constructor() {
		super(
			baseConnector({
				id: 'github',
				name: 'GitHub',
				provider: 'github',
				type: 'oauth',
				description: 'Search repositories and create or update issues.',
				scopes: ['repo:read', 'issues:write'],
				permissions: ['readMetadata', 'readPrivate', 'writeExternal', 'delete'],
				dataSensitivity: 'internal',
				metadata: { allowedWriteTools: ['create', 'update'] },
			}),
			[
				{
					name: 'search',
					description: 'Search GitHub issues.',
					inputSchema: schema({ query: { type: 'string' }, repo: { type: 'string' } }, ['query']),
					requiredScopes: ['repo:read'],
					requiredPermissions: ['readMetadata'],
					actionType: 'search',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ issues: [{ id: 42, title: 'Follow-up task' }] }),
				},
				{
					name: 'read',
					description: 'Read a GitHub issue.',
					inputSchema: schema({ issueId: { type: 'integer' }, repo: { type: 'string' } }, ['issueId']),
					requiredScopes: ['repo:read'],
					requiredPermissions: ['readPrivate'],
					actionType: 'read',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ id: 42, body: 'Issue details' }),
				},
				{
					name: 'create',
					description: 'Create a public GitHub issue.',
					inputSchema: schema({ repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, ['repo', 'title']),
					requiredScopes: ['issues:write'],
					requiredPermissions: ['writeExternal'],
					actionType: 'publicPost',
					readWrite: 'write',
					externalVisibility: true,
					reviewed: true,
					handler: () => ({ issueId: 43, url: 'https://github.example/issues/43' }),
				},
				{
					name: 'update',
					description: 'Update a GitHub issue.',
					inputSchema: schema({ issueId: { type: 'integer' }, body: { type: 'string' } }, ['issueId']),
					requiredScopes: ['issues:write'],
					requiredPermissions: ['writeExternal'],
					actionType: 'publicPost',
					readWrite: 'write',
					externalVisibility: true,
					reviewed: true,
					handler: () => ({ updated: true }),
				},
				{
					name: 'delete',
					description: 'Delete a GitHub issue-like resource.',
					inputSchema: schema({ issueId: { type: 'integer' } }, ['issueId']),
					requiredScopes: ['issues:write'],
					requiredPermissions: ['delete'],
					actionType: 'delete',
					readWrite: 'write',
					destructive: true,
					reviewed: true,
					handler: () => ({ deleted: true }),
				},
			]
		);
	}
}

export class SlackConnector extends MockConnectorRuntime {
	constructor() {
		super(
			baseConnector({
				id: 'slack',
				name: 'Slack',
				provider: 'slack',
				type: 'oauth',
				description: 'Search Slack and draft or send messages.',
				scopes: ['search:read', 'chat:write'],
				permissions: ['readMetadata', 'readPrivate', 'writeDraft', 'writeExternal', 'delete'],
				metadata: { allowedWriteTools: ['draft'] },
			}),
			[
				{
					name: 'search',
					description: 'Search Slack messages.',
					inputSchema: schema({ query: { type: 'string' } }, ['query']),
					requiredScopes: ['search:read'],
					requiredPermissions: ['readMetadata'],
					actionType: 'search',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ messages: [{ id: 'slack_1', text: 'Status update' }] }),
				},
				{
					name: 'read',
					description: 'Read a Slack message.',
					inputSchema: schema({ messageId: { type: 'string' } }, ['messageId']),
					requiredScopes: ['search:read'],
					requiredPermissions: ['readPrivate'],
					actionType: 'read',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ id: 'slack_1', text: 'Message text' }),
				},
				{
					name: 'draft',
					description: 'Draft a Slack message locally.',
					inputSchema: schema({ channel: { type: 'string' }, text: { type: 'string' } }, ['channel', 'text']),
					requiredScopes: [],
					requiredPermissions: ['writeDraft'],
					actionType: 'draft',
					readWrite: 'write',
					reviewed: true,
					handler: () => ({ draftId: 'slack_draft_1' }),
				},
				{
					name: 'send',
					description: 'Post a Slack message.',
					inputSchema: schema({ channel: { type: 'string' }, text: { type: 'string' } }, ['channel', 'text']),
					requiredScopes: ['chat:write'],
					requiredPermissions: ['writeExternal'],
					actionType: 'sendMessage',
					readWrite: 'write',
					externalVisibility: true,
					reviewed: true,
					handler: () => ({ ts: '123.456', status: 'posted' }),
				},
				{
					name: 'delete',
					description: 'Delete a Slack message.',
					inputSchema: schema({ channel: { type: 'string' }, ts: { type: 'string' } }, ['channel', 'ts']),
					requiredScopes: ['chat:write'],
					requiredPermissions: ['delete'],
					actionType: 'delete',
					readWrite: 'write',
					destructive: true,
					reviewed: true,
					handler: () => ({ deleted: true }),
				},
			]
		);
	}
}

export class LocalFilesMCPConnector extends MockConnectorRuntime {
	constructor() {
		super(
			baseConnector({
				id: 'local_files_mcp',
				name: 'Local Files MCP',
				provider: 'local',
				type: 'mcp',
				description: 'Mock local filesystem MCP connector.',
				scopes: ['files.read', 'files.write'],
				permissions: ['readMetadata', 'readPrivate', 'writePrivate', 'delete'],
				trustLevel: 'userInstalled',
				mcpServerConfig: {
					transport: 'local',
					command: process.execPath,
					args: ['mock-files-mcp'],
					env: { PATH: process.env.PATH ?? '' },
					sandbox: true,
				},
				metadata: { allowedWriteTools: ['update'] },
			}),
			[
				{
					name: 'search',
					description: 'Search local file names and snippets.',
					inputSchema: schema({ query: { type: 'string' } }, ['query']),
					requiredScopes: ['files.read'],
					requiredPermissions: ['readMetadata'],
					actionType: 'search',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ files: [{ id: 'file_1', path: '/workspace/notes.md' }] }),
				},
				{
					name: 'read',
					description: 'Read a local file snippet.',
					inputSchema: schema({ fileId: { type: 'string' }, maxChars: { type: 'integer' } }, ['fileId']),
					requiredScopes: ['files.read'],
					requiredPermissions: ['readPrivate'],
					actionType: 'read',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ fileId: 'file_1', snippet: 'Local file content snippet.' }),
				},
				{
					name: 'update',
					description: 'Update a local file.',
					inputSchema: schema({ fileId: { type: 'string' }, patch: { type: 'string' } }, ['fileId', 'patch']),
					requiredScopes: ['files.write'],
					requiredPermissions: ['writePrivate'],
					actionType: 'update',
					readWrite: 'write',
					reviewed: true,
					handler: () => ({ updated: true }),
				},
				{
					name: 'delete',
					description: 'Delete a local file.',
					inputSchema: schema({ fileId: { type: 'string' } }, ['fileId']),
					requiredScopes: ['files.write'],
					requiredPermissions: ['delete'],
					actionType: 'delete',
					readWrite: 'write',
					destructive: true,
					reviewed: true,
					handler: () => ({ deleted: true }),
				},
			]
		);
	}
}

export class MemoryMCPConnector extends MockConnectorRuntime {
	constructor() {
		super(
			baseConnector({
				id: 'memory_mcp',
				name: 'Memory MCP',
				provider: 'friday',
				type: 'internal',
				description: 'Read and manage approved memory records.',
				scopes: ['memory.read', 'memory.write'],
				permissions: ['readMetadata', 'readPrivate', 'writePrivate', 'delete'],
				trustLevel: 'firstParty',
				dataSensitivity: 'private',
				metadata: { allowedWriteTools: ['create', 'update'] },
			}),
			[
				{
					name: 'search',
					description: 'Search approved memory records.',
					inputSchema: schema({ query: { type: 'string' } }, ['query']),
					requiredScopes: ['memory.read'],
					requiredPermissions: ['readMetadata'],
					actionType: 'search',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ memories: [{ id: 'mem_1', text: 'Prefers Gmail over Outlook.' }] }),
				},
				{
					name: 'read',
					description: 'Read an approved memory by id.',
					inputSchema: schema({ memoryId: { type: 'string' } }, ['memoryId']),
					requiredScopes: ['memory.read'],
					requiredPermissions: ['readPrivate'],
					actionType: 'read',
					readWrite: 'read',
					reviewed: true,
					handler: () => ({ id: 'mem_1', text: 'Prefers Gmail over Outlook.' }),
				},
				{
					name: 'create',
					description: 'Create an approved memory record.',
					inputSchema: schema({ key: { type: 'string' }, value: { type: 'string' }, userApproved: { type: 'boolean' } }, ['key', 'value', 'userApproved']),
					requiredScopes: ['memory.write'],
					requiredPermissions: ['writePrivate'],
					actionType: 'create',
					readWrite: 'write',
					reviewed: true,
					handler: (args) => ({ memoryId: 'mem_new', stored: Boolean((args as { userApproved?: boolean }).userApproved) }),
				},
				{
					name: 'update',
					description: 'Update an approved memory record.',
					inputSchema: schema({ memoryId: { type: 'string' }, value: { type: 'string' }, userApproved: { type: 'boolean' } }, ['memoryId', 'value', 'userApproved']),
					requiredScopes: ['memory.write'],
					requiredPermissions: ['writePrivate'],
					actionType: 'update',
					readWrite: 'write',
					reviewed: true,
					handler: () => ({ updated: true }),
				},
				{
					name: 'delete',
					description: 'Delete a memory record.',
					inputSchema: schema({ memoryId: { type: 'string' } }, ['memoryId']),
					requiredScopes: ['memory.write'],
					requiredPermissions: ['delete'],
					actionType: 'delete',
					readWrite: 'write',
					destructive: true,
					reviewed: true,
					handler: () => ({ deleted: true }),
				},
			]
		);
	}
}

export function createMockConnectorRuntimeMap(runtimes: MockConnectorRuntime[]): Map<string, MockConnectorRuntime> {
	return new Map(runtimes.map((runtime) => [runtime.definition.id, runtime]));
}
