import { randomUUID } from 'node:crypto';
import type { StoreService } from '../store';
import type { LoggerService } from '../logger';
import type { McpRegistry } from '../mcp';
import { normalizeMcpError } from '../mcp';
import type {
	ConnectorCallToolOptions,
	ConnectorConfig,
	ConnectorInput,
	ConnectorStatus,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorUpdateInput,
	ConnectorView,
} from '../../shared/connectors';

function toView(connector: ConnectorConfig): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		transport: connector.transport,
		enabled: connector.enabled,
		connectionStatus: connector.connectionStatus,
		toolsCount: connector.tools.length,
		lastRefreshedAt: connector.lastRefreshedAt,
		lastError: connector.lastError,
	};
}

function sanitizeInput(input: ConnectorInput): ConnectorInput {
	const name = input.name.trim();
	const command = input.command.trim();
	const cwd = input.cwd?.trim();
	const url = input.url?.trim();

	if (!name) throw new Error('Connector name is required.');
	if (input.transport === 'stdio' && !command) throw new Error('Command is required.');
	if (input.transport === 'http' && !url) throw new Error('URL is required.');

	return {
		name,
		transport: input.transport,
		command,
		args: input.args.map((arg) => arg.trim()).filter(Boolean),
		env: Object.fromEntries(
			Object.entries(input.env)
				.map(([key, value]) => [key.trim(), value] as const)
				.filter(([key]) => key.length > 0)
		),
		cwd: cwd || undefined,
		url: url || undefined,
		enabled: input.enabled ?? true,
	};
}

export class ConnectorsService {
	constructor(
		private readonly store: StoreService,
		private readonly logger: LoggerService,
		private readonly mcpRegistry: McpRegistry
	) {}

	list(): ConnectorView[] {
		return this.store.getConnectors().map(toView);
	}

	get(id: string): ConnectorConfig {
		const connector = this.store.getConnectorById(id);
		if (!connector) throw new Error(`Connector not found: ${id}`);
		return connector;
	}

	async restoreEnabledConnectors(): Promise<void> {
		await Promise.all(
			this.store
				.getConnectors()
				.filter((connector) => connector.enabled)
				.map((connector) => this.connectAndRefresh(connector).catch(() => undefined))
		);
	}

	async add(input: ConnectorInput): Promise<ConnectorConfig> {
		const sanitized = sanitizeInput(input);
		const now = new Date().toISOString();
		const connector: ConnectorConfig = {
			...sanitized,
			id: randomUUID(),
			connectionStatus: 'unknown',
			tools: [],
			createdAt: now,
			updatedAt: now,
			enabled: sanitized.enabled ?? true,
		};
		this.store.setConnectors([...this.store.getConnectors(), connector]);
		if (!connector.enabled) return connector;
		return this.connectAndRefresh(connector);
	}

	async update(id: string, input: ConnectorUpdateInput): Promise<ConnectorConfig> {
		const current = this.get(id);
		const merged = sanitizeInput({
			name: input.name ?? current.name,
			transport: input.transport ?? current.transport,
			command: input.command ?? current.command,
			args: input.args ?? current.args,
			env: input.env ?? current.env,
			cwd: input.cwd ?? current.cwd,
			url: input.url ?? current.url,
			enabled: input.enabled ?? current.enabled,
		});
		const next: ConnectorConfig = {
			...current,
			...merged,
			updatedAt: new Date().toISOString(),
		};
		this.replace(next);
		if (!next.enabled) {
			await this.mcpRegistry.disconnect(id);
			return next;
		}
		return this.connectAndRefresh(next);
	}

	async remove(id: string): Promise<void> {
		await this.mcpRegistry.disconnect(id);
		this.store.setConnectors(this.store.getConnectors().filter((connector) => connector.id !== id));
	}

	async enable(id: string): Promise<ConnectorConfig> {
		const connector = { ...this.get(id), enabled: true, updatedAt: new Date().toISOString() };
		this.replace(connector);
		return this.connectAndRefresh(connector);
	}

	async disable(id: string): Promise<ConnectorConfig> {
		await this.mcpRegistry.disconnect(id);
		const connector = {
			...this.get(id),
			enabled: false,
			connectionStatus: 'disconnected' as ConnectorStatus,
			updatedAt: new Date().toISOString(),
		};
		this.replace(connector);
		return connector;
	}

	async test(id: string): Promise<ConnectorTestResult> {
		const connector = this.get(id);
		try {
			if (!this.mcpRegistry.isConnected(id)) {
				await this.mcpRegistry.connect(connector);
			}
			await this.mcpRegistry.healthCheck(id);
			this.setStatus(id, 'connected');
			return { status: 'connected', message: 'Connected' };
		} catch (error) {
			const normalized = normalizeMcpError(error, `Failed to test ${connector.name}.`);
			const message = normalized.message;
			this.logger.warn('ConnectorsService', `Test failed for ${connector.name}: ${message}`);
			this.setStatus(id, 'error', message);
			return { status: 'error', message };
		}
	}

	async reconnect(id: string): Promise<ConnectorTestResult> {
		const connector = this.get(id);
		try {
			await this.mcpRegistry.reconnect(connector);
			const tools = await this.mcpRegistry.refreshTools(id);
			this.replaceConnected(connector, tools);
			return { status: 'connected', message: 'Connected' };
		} catch (error) {
			const normalized = normalizeMcpError(error, `Failed to reconnect ${connector.name}.`);
			this.setStatus(id, 'error', normalized.message);
			return { status: 'error', message: normalized.message };
		}
	}

	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.get(id);
		if (!this.mcpRegistry.isConnected(id)) {
			await this.mcpRegistry.connect(connector);
		}
		const tools = await this.mcpRegistry.refreshTools(id);
		this.replaceConnected(connector, tools);
		return tools;
	}

	listTools(id: string): ConnectorTool[] {
		return this.get(id).tools;
	}

	async callTool(
		id: string,
		name: string,
		args: unknown,
		options?: ConnectorCallToolOptions
	): Promise<unknown> {
		const connector = this.get(id);
		if (!connector.enabled) throw new Error(`Connector is disabled: ${connector.name}`);
		if (!this.mcpRegistry.isConnected(id)) {
			await this.mcpRegistry.connect(connector);
		}
		try {
			return await this.mcpRegistry.callTool(id, name, args, options);
		} catch (error) {
			throw normalizeMcpError(error, `Failed to execute ${name}.`);
		}
	}

	private async connectAndRefresh(connector: ConnectorConfig): Promise<ConnectorConfig> {
		try {
			await this.mcpRegistry.reconnect(connector);
			const tools = await this.mcpRegistry.refreshTools(connector.id);
			return this.replaceConnected(connector, tools);
		} catch (error) {
			const normalized = normalizeMcpError(error, `Failed to connect ${connector.name}.`);
			const next = {
				...connector,
				connectionStatus: 'error' as ConnectorStatus,
				lastError: normalized.message,
				updatedAt: new Date().toISOString(),
			};
			this.replace(next);
			return next;
		}
	}

	private replaceConnected(connector: ConnectorConfig, tools: ConnectorTool[]): ConnectorConfig {
		const next = {
			...connector,
			connectionStatus: 'connected' as ConnectorStatus,
			tools,
			lastRefreshedAt: new Date().toISOString(),
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		};
		this.replace(next);
		return next;
	}

	private setStatus(id: string, status: ConnectorStatus, lastError?: string): void {
		const connector = this.get(id);
		this.replace({
			...connector,
			connectionStatus: status,
			lastError,
			updatedAt: new Date().toISOString(),
		});
	}

	private replace(connector: ConnectorConfig): void {
		this.store.setConnectors(
			this.store.getConnectors().map((item) => (item.id === connector.id ? connector : item))
		);
	}
}
