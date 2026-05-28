import type { LoggerService } from '../../logger';
import { CONNECTOR_TOOL_PERMISSIONS, DEFAULT_CONNECTOR_TOOL_PERMISSION } from '../../../shared/connector';
import type {
	ConnectorCallToolOptions,
	ConnectorConfig,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorToolPermission,
} from '../../../shared/connector';
import {
	connectorAuthKindFor,
	connectorHasAuthorization,
	connectorStatusFor,
	isOAuthConnector,
	missingMcpSecretMessage,
	missingMcpSecretNames,
} from './config';
import { createSdkConnectorMcpClient } from './client';
import type {
	AgentMcpClientServicePort,
	ConnectorMcpClient,
	ConnectorMcpClientFactory,
	McpConnectorStore,
} from './types';

const MCP_CLIENT_LOG_SOURCE = 'AgentMcpClientService';

export interface AgentMcpClientServiceOptions {
	mcpClientFactory?: ConnectorMcpClientFactory;
}

export class AgentMcpClientService implements AgentMcpClientServicePort {
	private readonly clients = new Map<string, ConnectorMcpClient>();

	constructor(
		private readonly logger: LoggerService,
		private readonly connectors: McpConnectorStore,
		private readonly options: AgentMcpClientServiceOptions = {}
	) {}

	list(): ConnectorConfig[] {
		return this.connectors.listConnectorsForMcp().map((connector) => ({
			id: connector.id,
			name: connector.name,
			connectorId: connector.connectorId,
			authKind: connectorAuthKindFor(connector),
			serverLabel: connector.serverLabel,
			enabled: connector.enabled,
			status: connectorStatusFor(connector),
			requireApproval: connector.requireApproval,
			allowedToolsCount: connector.allowedTools?.length ?? 0,
			toolsCount: connector.tools.length,
			hasToken: connectorHasAuthorization(connector),
			hasTools: connector.tools.length > 0,
			deferLoading: connector.deferLoading,
			lastRefreshedAt: connector.lastRefreshedAt,
			lastError: connector.lastError,
			connectedAccount: connector.oauth?.accountEmail,
			tools: [],
		}));
	}

	async test(id: string): Promise<ConnectorTestResult> {
		const connector = this.connectors.getConnectorForMcp(id);
		const status = connectorStatusFor(connector);
		if (status === 'disabled') return { status, message: 'Connector is disabled.' };
		if (status === 'missing_auth') {
			return {
				status,
				message: missingMcpSecretMessage(connector) ?? 'MCP connector configuration is incomplete.',
			};
		}
		if (connector.oauth) {
			return { status: 'configured', message: 'OAuth connector is configured with ' + connector.tools.length + ' tools.' };
		}
		try {
			const tools = await this.refreshTools(id);
			return { status: 'configured', message: 'MCP server is reachable with ' + tools.length + ' tools.' };
		} catch (error) {
			return { status: 'error', message: errorMessage(error) };
		}
	}

	async reconnect(id: string): Promise<ConnectorTestResult> {
		return this.test(id);
	}

	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.connectors.getConnectorForMcp(id);
		const next = isOAuthConnector(connector)
			? await this.withOAuthTools(connector)
			: await this.withMcpTools(connector);
		this.connectors.saveConnectorFromMcp(next);
		return next.tools;
	}

	listTools(id: string): ConnectorTool[] {
		return this.connectors.getConnectorForMcp(id).tools;
	}

	async callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		const connectorId = readRequiredString(id, 'Connector id');
		const toolName = readRequiredString(name, 'Connector tool name');
		const callOptions = readConnectorCallToolOptions(options);
		const nextArgs = readConnectorToolArguments(args);
		const connector = this.connectors.getConnectorForMcp(connectorId);
		const tool = connector.tools.find((item) => item.name === toolName);
		if (connectorStatusFor(connector) !== 'configured') {
			throw new Error('Connector is not configured: ' + connectorName(connector));
		}
		if (!tool) {
			throw new Error('Tool ' + toolName + ' is not enabled for ' + connectorName(connector) + '.');
		}
		if (tool.permission === 'blocked') {
			throw new Error('Tool ' + toolName + ' is blocked for ' + connectorName(connector) + '.');
		}
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

	async refreshConnectorToolsIfConfigured(connector: ConnectorConfig): Promise<ConnectorConfig> {
		if (isOAuthConnector(connector)) {
			return this.withOAuthTools(connector);
		}
		if (!connector.mcp) {
			return connector;
		}
		if (connector.enabled === false || missingMcpSecretNames(connector).length > 0) {
			return connector;
		}
		try {
			return await this.withDiscoveredTools(connector);
		} catch (error) {
			return { ...connector, tools: [], lastError: errorMessage(error) };
		}
	}

	async close(): Promise<void> {
		await Promise.all([...this.clients.keys()].map((id) => this.closeClient(id)));
	}

	async closeConnector(id: string): Promise<void> {
		await this.closeClient(id);
	}

	private async withMcpTools(connector: ConnectorConfig): Promise<ConnectorConfig> {
		const missing = missingMcpSecretNames(connector);
		if (missing.length > 0) throw new Error('Missing MCP secret environment variable: ' + missing.join(', '));
		return this.withDiscoveredTools(connector);
	}

	private async withOAuthTools(connector: ConnectorConfig): Promise<ConnectorConfig> {
		if (!connector.mcp) return connector;
		try {
			return await this.withDiscoveredTools(connector, DEFAULT_CONNECTOR_TOOL_PERMISSION);
		} catch (error) {
			return { ...connector, lastError: errorMessage(error) };
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
		const connectorId = connector.id ?? connector.connectorId ?? connector.serverLabel ?? connectorName(connector);
		const existing = this.clients.get(connectorId);
		if (existing) return existing;
		const client = this.options.mcpClientFactory?.(connector) ?? createSdkConnectorMcpClient(connector);
		this.clients.set(connectorId, client);
		return client;
	}

	private requireConfiguredConnector(id: unknown): ConnectorConfig {
		const connectorId = readRequiredString(id, 'Connector id');
		const connector = this.connectors.getConnectorForMcp(connectorId);
		if (connectorStatusFor(connector) !== 'configured') {
			throw new Error('Connector is not configured: ' + connectorName(connector));
		}
		return connector;
	}

	private async closeClient(id: string): Promise<void> {
		const client = this.clients.get(id);
		if (!client) return;
		this.clients.delete(id);
		await client.close();
		this.logger.debug(MCP_CLIENT_LOG_SOURCE, 'Closed MCP client', { connectorId: id });
	}
}

function readRequiredString(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(label + ' must be a string.');
	const trimmed = value.trim();
	if (!trimmed) throw new Error(label + ' is required.');
	return trimmed;
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

function permissionForTool(connector: ConnectorConfig, toolName: string): ConnectorToolPermission {
	if (isOAuthConnector(connector)) return DEFAULT_CONNECTOR_TOOL_PERMISSION;
	const allowedTools = connector.allowedTools ?? [];
	if (allowedTools.length > 0 && !allowedTools.includes(toolName)) return 'blocked';
	if (connector.requireApproval === 'never') return 'always-allow';
	if (connector.requireApproval === 'never_for_allowed_tools' && allowedTools.includes(toolName)) return 'always-allow';
	return 'needs-approval';
}

function connectorName(connector: ConnectorConfig): string {
	return connector.name ?? connector.serverLabel ?? connector.connectorId ?? connector.id ?? 'Connector';
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
