import type { ConnectorsService } from '../connectors';
import type { AgentTool } from '../tools/shared/types';
import type {
	ConnectorConfig,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorView,
	OpenAiMcpConnectorToolSpec,
} from '../../shared/connector';
import {
	isOpenAiResponsesConnector,
	toConnectorStatus,
} from '../connectors/components/runtime';
import { readToolArgs, readToolOptions, requireString } from './validation';
import {
	applyToolPolicy,
	assertMcpSecrets,
	normalizeTool,
	resolveMcpSecrets,
	toAgentTool,
} from './runtime';
import type { ConnectorMcpClient, ConnectorToolsServiceOptions } from './types';
import { toAnthropicConnectorTools } from './adapters/anthropic';
import {
	toOpenAiConnectorTools,
	withOpenAiResponsesConnectorTools,
} from './adapters/openai';

export class ConnectorToolsService {
	private readonly runtimeTools = new Map<string, ConnectorTool[]>();

	constructor(
		private readonly connectors: ConnectorsService,
		private readonly options: ConnectorToolsServiceOptions = {}
	) {}

	list(): ConnectorView[] {
		return this.connectors.list();
	}

	async reconnect(id: string): Promise<ConnectorTestResult> {
		await this.refreshTools(id);
		return this.testConnector(id);
	}

	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.connectors.getStored(id);
		const next = isOpenAiResponsesConnector(connector)
			? { ...withOpenAiResponsesConnectorTools(connector), lastRefreshedAt: new Date().toISOString() }
			: await this.withDiscoveredTools(connector);
		this.rememberTools(next, next.tools);
		this.connectors.replaceStored(next);
		return this.effectiveTools(next);
	}

	listTools(id: string): ConnectorTool[] {
		const connector = this.connectors.getStored(id);
		return this.effectiveTools(this.withRuntimeTools(connector));
	}

	updateOpenAiConnectorTools(serverLabel: string, tools: ConnectorTool[]): void {
		const connector = this.findOpenAiConnectorByServerLabel(serverLabel);
		if (!connector) return;
		const normalized = tools.map(normalizeTool);
		this.rememberTools(connector, normalized);
		this.connectors.replaceStored({
			...connector,
			lastError: undefined,
			lastRefreshedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
	}

	canApproveOpenAiConnectorTool(serverLabel: string, toolName: string): boolean {
		const connector = this.findOpenAiConnectorByServerLabel(serverLabel);
		if (!connector) return false;
		const tool = this.effectiveTools(this.withRuntimeTools(connector)).find((item) => item.name === toolName);
		return Boolean(tool && tool.permission === 'always-allow' && !tool.requiresApproval);
	}

	async callTool(id?: unknown, name?: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		const connectorId = requireString(id, 'Connector id');
		const toolName = requireString(name, 'Connector tool name');
		const toolArgs = readToolArgs(args);
		const toolOptions = readToolOptions(options);
		const connector = this.connectors.getStored(connectorId);
		const status = toConnectorStatus(connector, this.env());
		if (status !== 'configured') throw new Error(`Connector is not configured: ${connector.name}`);
		if (isOpenAiResponsesConnector(connector)) {
			throw new Error('OpenAI connector tools are executed by OpenAI Responses API.');
		}
		const tool = this.effectiveTools(connector).find((item) => item.name === toolName);
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
		const client = this.mcpClient(this.connectors.getStored(requireString(id, 'Connector id')));
		try {
			return client.listResources ? client.listResources() : [];
		} finally {
			await client.close?.();
		}
	}

	async readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.connectors.getStored(requireString(id, 'Connector id')));
		try {
			if (!client.readResource) throw new Error('MCP resources are not supported by this connector.');
			return client.readResource(requireString(uri, 'MCP resource URI'), options);
		} finally {
			await client.close?.();
		}
	}

	async listPrompts(id: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.connectors.getStored(requireString(id, 'Connector id')));
		try {
			return client.listPrompts ? client.listPrompts(options) : [];
		} finally {
			await client.close?.();
		}
	}

	async getPrompt(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		const client = this.mcpClient(this.connectors.getStored(requireString(id, 'Connector id')));
		try {
			if (!client.getPrompt) throw new Error('MCP prompts are not supported by this connector.');
			return client.getPrompt(requireString(name, 'MCP prompt name'), readToolArgs(args), options);
		} finally {
			await client.close?.();
		}
	}

	createAgentTools(): AgentTool[] {
		return this.connectors.listStored()
			.filter((connector) => connector.enabled && toConnectorStatus(connector, this.env()) === 'configured')
			.filter((connector) => !isOpenAiResponsesConnector(connector))
			.flatMap((connector) =>
				this.effectiveTools(connector)
					.filter((tool) => tool.permission !== 'blocked')
					.map((tool) => toAgentTool(connector, tool, (connectorId, toolName, toolArgs) => this.callTool(connectorId, toolName, toolArgs)))
			);
	}

	createOpenAIConnectorTools(): OpenAiMcpConnectorToolSpec[] {
		return toOpenAiConnectorTools(this.connectors.listStored(), this.env());
	}

	createAnthropicConnectorTools(): OpenAiMcpConnectorToolSpec[] {
		return toAnthropicConnectorTools(this.connectors.listStored(), this.env());
	}

	createBuiltInConnectorTools(providerId: string): OpenAiMcpConnectorToolSpec[] {
		const normalizedProviderId = providerId.trim().toLowerCase();
		if (normalizedProviderId === 'openai') return this.createOpenAIConnectorTools();
		if (normalizedProviderId === 'anthropic') return this.createAnthropicConnectorTools();
		return [];
	}

	private async withDiscoveredTools(connector: ConnectorConfig): Promise<ConnectorConfig> {
		const client = this.mcpClient(connector);
		try {
			const discovered = await client.listTools();
			return {
				...connector,
				tools: discovered.map(normalizeTool),
				lastError: undefined,
				lastRefreshedAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
		} finally {
			await client.close?.();
		}
	}

	private effectiveTools(connector: ConnectorConfig): ConnectorTool[] {
		return applyToolPolicy(connector.tools, connector.allowedTools, connector.requireApproval);
	}

	private rememberTools(connector: ConnectorConfig, tools: ConnectorTool[]): void {
		this.runtimeTools.set(connector.id, tools);
		this.runtimeTools.set(connector.serverLabel, tools);
	}

	private withRuntimeTools(connector: ConnectorConfig): ConnectorConfig {
		return {
			...connector,
			tools: this.runtimeTools.get(connector.id) ?? this.runtimeTools.get(connector.serverLabel) ?? connector.tools,
		};
	}

	private findOpenAiConnectorByServerLabel(serverLabel: string): ConnectorConfig | undefined {
		const label = serverLabel.trim();
		return this.connectors.listStored()
			.filter(isOpenAiResponsesConnector)
			.find((connector) => connector.serverLabel === label);
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

	private testConnector(id: string): ConnectorTestResult {
		const connector = this.connectors.getStored(id);
		const status = toConnectorStatus(connector, this.env());
		if (status === 'configured') return { status, message: 'Connector is configured.' };
		if (status === 'missing_auth') return { status, message: 'Connector credentials are missing.' };
		if (status === 'disabled') return { status, message: 'Connector is disabled.' };
		return { status, message: connector.lastError ?? 'Connector has a configuration error.' };
	}
}
