import { randomUUID } from 'node:crypto';
import type { LoggerService } from '../observability';
import type { AgentTool } from '../tools/shared/types';
import type {
	ConnectorCatalogEntry,
	ConnectorConfig,
	ConnectorOAuthAuthorizeRequest,
	ConnectorOAuthAuthorizeResult,
	ConnectorOAuthCompleteInput,
	ConnectorOAuthConnectResult,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorView,
	OpenAiMcpConnectorToolSpec,
} from '../../shared/connector';
import {
	readOptionalApprovalMode,
	readOptionalBoolean,
	readOptionalMcp,
	readOptionalString,
	readOptionalStringArray,
	readToolArgs,
	readToolOptions,
	requireObject,
	requireString,
	sanitizeInput,
	serverLabelFromName,
} from './components/validation';
import {
	isOpenAiResponsesConnector,
	toAgentTool,
	applyToolPolicy,
	assertMcpSecrets,
	cloneValue,
	errorMessage,
	hasMissingMcpSecrets,
	redactConnectorSecrets,
	resolveMcpSecrets,
	toConnectorStatus,
	toConnectorView,
} from './components/runtime';
import { ConnectorRepository } from './components/repository';
import {
	openAiResponsesConnectorTools,
	toOpenAiConnectorTools,
	withOpenAiResponsesConnectorTools,
} from './adapters/openai';
import { toAnthropicConnectorTools } from './adapters/anthropic';
import type { ConnectorMcpClient, ConnectorsServiceOptions } from './types';

export class ConnectorsService {
	private readonly repository: ConnectorRepository;
	private readonly options: ConnectorsServiceOptions;

	constructor(private readonly logger: LoggerService, options?: ConnectorsServiceOptions) {
		this.options = options ?? {};
		this.repository = new ConnectorRepository(logger);
	}

	catalog(): readonly ConnectorCatalogEntry[] {
		return [];
	}

	list(): ConnectorView[] {
		return this.connectors().map((connector) => toConnectorView(connector, this.env()));
	}

	get(id: string): ConnectorConfig {
		return redactConnectorSecrets(this.repository.get(id));
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
				serverUrl: sanitized.serverUrl,
				enabled: sanitized.enabled ?? true,
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
			const next = await this.prepareConnector(connector, true);
			this.repository.write([...this.connectors(), next]);
			return redactConnectorSecrets(next);
		} catch (error) {
			this.warn('Connector validation failed', { action: 'add', error: errorMessage(error) });
			throw error;
		}
	}

	async update(id: string, input: unknown): Promise<ConnectorConfig> {
		const current = this.repository.get(id);
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
		this.repository.replace(next);
		return redactConnectorSecrets(next);
	}

	async remove(id: string): Promise<void> {
		this.repository.write(this.connectors().filter((connector) => connector.id !== id));
	}

	async enable(id: string): Promise<ConnectorConfig> {
		const connector = { ...this.repository.get(id), enabled: true, updatedAt: new Date().toISOString() };
		this.repository.replace(connector);
		return redactConnectorSecrets(connector);
	}

	async disable(id: string): Promise<ConnectorConfig> {
		const connector = { ...this.repository.get(id), enabled: false, updatedAt: new Date().toISOString() };
		this.repository.replace(connector);
		return redactConnectorSecrets(connector);
	}

	async test(id: string): Promise<ConnectorTestResult> {
		const connector = this.repository.get(id);
		const status = toConnectorStatus(connector, this.env());
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
		const connector = this.connectors().find((item) => item.oauth?.state === state);
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
		this.repository.replace(next);
		return redactConnectorSecrets(next);
	}

	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.repository.get(id);
		const next = isOpenAiResponsesConnector(connector)
			? { ...withOpenAiResponsesConnectorTools(connector), lastRefreshedAt: new Date().toISOString() }
			: await this.withDiscoveredTools(connector, false);
		this.repository.replace(next);
		return next.tools;
	}

	listTools(id: string): ConnectorTool[] {
		return this.repository.get(id).tools;
	}

	getConnectorSettings(): ConnectorConfig[] {
		return this.connectors().map(redactConnectorSecrets);
	}

	async callTool(id?: unknown, name?: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		const connectorId = requireString(id, 'Connector id');
		const toolName = requireString(name, 'Connector tool name');
		const toolArgs = readToolArgs(args);
		const toolOptions = readToolOptions(options);
		const connector = this.repository.get(connectorId);
		const status = toConnectorStatus(connector, this.env());
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
		const client = this.mcpClient(this.repository.get(requireString(id, 'Connector id')));
		try {
			return client.listResources ? client.listResources() : [];
		} finally {
			await client.close?.();
		}
	}

	async readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.repository.get(requireString(id, 'Connector id')));
		try {
			if (!client.readResource) throw new Error('MCP resources are not supported by this connector.');
			return client.readResource(requireString(uri, 'MCP resource URI'), options);
		} finally {
			await client.close?.();
		}
	}

	async listPrompts(id: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.repository.get(requireString(id, 'Connector id')));
		try {
			return client.listPrompts ? client.listPrompts(options) : [];
		} finally {
			await client.close?.();
		}
	}

	async getPrompt(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.repository.get(requireString(id, 'Connector id')));
		try {
			if (!client.getPrompt) throw new Error('MCP prompts are not supported by this connector.');
			return client.getPrompt(requireString(name, 'MCP prompt name'), readToolArgs(args), options);
		} finally {
			await client.close?.();
		}
	}

	createAgentTools(): AgentTool[] {
		return this.connectors()
			.filter((connector) => connector.enabled && toConnectorStatus(connector, this.env()) === 'configured')
			.filter((connector) => !isOpenAiResponsesConnector(connector))
			.flatMap((connector) =>
				connector.tools
					.filter((tool) => tool.permission !== 'blocked')
					.map((tool) => toAgentTool(connector, tool, (connectorId, toolName, toolArgs) => this.callTool(connectorId, toolName, toolArgs)))
			);
	}

	createOpenAIConnectorTools(): OpenAiMcpConnectorToolSpec[] {
		return toOpenAiConnectorTools(this.connectors(), this.env());
	}

	createAnthropicConnectorTools(): OpenAiMcpConnectorToolSpec[] {
		return toAnthropicConnectorTools(this.connectors(), this.env());
	}

	createBuiltInConnectorTools(providerId: string): OpenAiMcpConnectorToolSpec[] {
		const normalizedProviderId = providerId.trim().toLowerCase();
		if (normalizedProviderId === 'openai') return this.createOpenAIConnectorTools();
		if (normalizedProviderId === 'anthropic') return this.createAnthropicConnectorTools();
		return [];
	}

	private async prepareConnector(connector: ConnectorConfig, containFailure: boolean): Promise<ConnectorConfig> {
		if (isOpenAiResponsesConnector(connector)) return withOpenAiResponsesConnectorTools(connector);
		if (hasMissingMcpSecrets(connector, this.env())) return connector;
		return this.withDiscoveredTools(connector, containFailure);
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

	private connectors(): ConnectorConfig[] {
		return this.repository.list();
	}

	private env(): NodeJS.ProcessEnv {
		return this.options.env ?? process.env;
	}

	private warn(message: string, details?: Record<string, unknown>): void {
		this.logger.warn('ConnectorsService', message, details);
	}
}
