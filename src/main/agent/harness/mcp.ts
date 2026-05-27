import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONSchema, ToolResultBlock } from '../../provider/types';
import type { AgentHarnessEventSink, AgentHarnessExternalToolProvider, AgentHarnessSession, AgentHarnessTool } from './types';
import { toHarnessErrorShape } from './errors';

export type AgentHarnessMcpServerConfig =
	| {
			name: string;
			transport: 'stdio';
			command: string;
			args?: string[];
			env?: Record<string, string>;
			cwd?: string;
			toolPrefix?: string;
	  }
	| {
			name: string;
			transport: 'http';
			url: string;
			headers?: Record<string, string>;
			sessionId?: string;
			toolPrefix?: string;
	  }
	| {
			name: string;
			transport: 'custom';
			createTransport: () => Transport;
			toolPrefix?: string;
	  };

export interface AgentHarnessMcpInventory {
	tools: Array<{ server: string; name: string; description?: string }>;
	resources: Array<{ server: string; uri: string; name: string; description?: string }>;
	prompts: Array<{ server: string; name: string; description?: string }>;
}

interface McpConnection {
	config: AgentHarnessMcpServerConfig;
	client: Client;
	transport: Transport;
	connected: boolean;
}

export class McpAgentHarnessToolProvider implements AgentHarnessExternalToolProvider {
	private readonly connections = new Map<string, McpConnection>();
	private readonly inventory: AgentHarnessMcpInventory = { tools: [], resources: [], prompts: [] };

	constructor(
		private readonly servers: AgentHarnessMcpServerConfig[],
		private readonly options: { events?: AgentHarnessEventSink; requestTimeoutMs?: number } = {}
	) {}

	async discover(input: {
		task: string;
		session: AgentHarnessSession;
		context: Record<string, unknown>;
	}): Promise<AgentHarnessTool[]> {
		const tools: AgentHarnessTool[] = [];
		for (const server of this.servers) {
			try {
				const connection = await this.connect(server);
				const [serverTools, resources, prompts] = await Promise.all([
					this.listTools(connection),
					this.listResources(connection),
					this.listPrompts(connection),
				]);
				this.mergeInventory(server.name, serverTools, resources, prompts);
				this.options.events?.emit({
					type: 'mcp.inventory',
					server: server.name,
					tools: serverTools.length,
					resources: resources.length,
					prompts: prompts.length,
				});
				tools.push(...serverTools.map((tool) => this.wrapTool(server, tool)));
			} catch (error) {
				this.options.events?.emit({
					type: 'mcp.server.error',
					server: server.name,
					error: toHarnessErrorShape(error),
				});
			}
		}
		this.options.events?.emit({
			type: 'tool.discovered',
			provider: 'mcp',
			count: tools.length,
			names: tools.map((tool) => tool.name),
		});
		return tools;
	}

	getInventory(): AgentHarnessMcpInventory {
		return {
			tools: this.inventory.tools.map((tool) => ({ ...tool })),
			resources: this.inventory.resources.map((resource) => ({ ...resource })),
			prompts: this.inventory.prompts.map((prompt) => ({ ...prompt })),
		};
	}

	async close(): Promise<void> {
		await Promise.all(
			[...this.connections.values()].map(async (connection) => {
				await connection.client.close();
				await connection.transport.close();
				this.options.events?.emit({ type: 'mcp.server.disconnected', server: connection.config.name });
			})
		);
		this.connections.clear();
	}

	private async connect(config: AgentHarnessMcpServerConfig): Promise<McpConnection> {
		const existing = this.connections.get(config.name);
		if (existing?.connected) return existing;
		this.options.events?.emit({ type: 'mcp.server.connecting', server: config.name });
		const client = new Client({ name: 'friday-agent-harness', version: '1.0.0' });
		const transport = this.createTransport(config);
		const connection: McpConnection = { config, client, transport, connected: false };
		transport.onclose = () => {
			connection.connected = false;
			this.options.events?.emit({ type: 'mcp.server.disconnected', server: config.name });
		};
		transport.onerror = (error) => {
			connection.connected = false;
			this.options.events?.emit({
				type: 'mcp.server.error',
				server: config.name,
				error: toHarnessErrorShape(error),
			});
		};
		await client.connect(transport, { timeout: this.options.requestTimeoutMs });
		connection.connected = true;
		this.connections.set(config.name, connection);
		this.options.events?.emit({ type: 'mcp.server.connected', server: config.name });
		return connection;
	}

	private createTransport(config: AgentHarnessMcpServerConfig): Transport {
		if (config.transport === 'stdio') {
			return new StdioClientTransport({
				command: config.command,
				args: config.args,
				env: config.env,
				cwd: config.cwd,
				stderr: 'pipe',
			});
		}
		if (config.transport === 'custom') {
			return config.createTransport();
		}
		return new StreamableHTTPClientTransport(new URL(config.url), {
			sessionId: config.sessionId,
			requestInit: config.headers ? { headers: config.headers } : undefined,
		});
	}

	private async listTools(connection: McpConnection): Promise<Array<{ name: string; description?: string; inputSchema: JSONSchema }>> {
		const collected: Array<{ name: string; description?: string; inputSchema: JSONSchema }> = [];
		let cursor: string | undefined;
		do {
			const result = await connection.client.listTools(cursor ? { cursor } : undefined, {
				timeout: this.options.requestTimeoutMs,
			});
			collected.push(...result.tools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema as JSONSchema,
			})));
			cursor = result.nextCursor;
		} while (cursor);
		return collected;
	}

	private async listResources(connection: McpConnection): Promise<Array<{ uri: string; name: string; description?: string }>> {
		const collected: Array<{ uri: string; name: string; description?: string }> = [];
		let cursor: string | undefined;
		do {
			const result = await connection.client.listResources(cursor ? { cursor } : undefined, {
				timeout: this.options.requestTimeoutMs,
			});
			collected.push(...result.resources.map((resource) => ({
				uri: resource.uri,
				name: resource.name,
				description: resource.description,
			})));
			cursor = result.nextCursor;
		} while (cursor);
		return collected;
	}

	private async listPrompts(connection: McpConnection): Promise<Array<{ name: string; description?: string }>> {
		const collected: Array<{ name: string; description?: string }> = [];
		let cursor: string | undefined;
		do {
			const result = await connection.client.listPrompts(cursor ? { cursor } : undefined, {
				timeout: this.options.requestTimeoutMs,
			});
			collected.push(...result.prompts.map((prompt) => ({
				name: prompt.name,
				description: prompt.description,
			})));
			cursor = result.nextCursor;
		} while (cursor);
		return collected;
	}

	private wrapTool(
		server: AgentHarnessMcpServerConfig,
		tool: { name: string; description?: string; inputSchema: JSONSchema }
	): AgentHarnessTool {
		const harnessName = `${sanitizeName(server.toolPrefix ?? server.name)}__${sanitizeName(tool.name)}`;
		return {
			name: harnessName,
			displayName: tool.name,
			group: 'mcp',
			description: `[MCP:${server.name}] ${tool.description ?? tool.name}`,
			schema: tool.inputSchema,
			externalWrite: true,
			execute: async (args, ctx) => {
				const connection = await this.connect(server);
				const result = await connection.client.callTool(
					{ name: tool.name, arguments: args },
					undefined,
					{ signal: ctx.signal, timeout: this.options.requestTimeoutMs, resetTimeoutOnProgress: true }
				);
				return {
					status: 'isError' in result && result.isError ? 'error' : 'ok',
					content: normalizeMcpContent(result),
					details: result,
				};
			},
		};
	}

	private mergeInventory(
		server: string,
		tools: Array<{ name: string; description?: string }>,
		resources: Array<{ uri: string; name: string; description?: string }>,
		prompts: Array<{ name: string; description?: string }>
	): void {
		this.inventory.tools = [
			...this.inventory.tools.filter((entry) => entry.server !== server),
			...tools.map((tool) => ({ server, name: tool.name, description: tool.description })),
		];
		this.inventory.resources = [
			...this.inventory.resources.filter((entry) => entry.server !== server),
			...resources.map((resource) => ({ server, ...resource })),
		];
		this.inventory.prompts = [
			...this.inventory.prompts.filter((entry) => entry.server !== server),
			...prompts.map((prompt) => ({ server, name: prompt.name, description: prompt.description })),
		];
	}
}

function normalizeMcpContent(result: unknown): ToolResultBlock[] {
	if (!result || typeof result !== 'object') return [{ type: 'text', text: String(result) }];
	if ('content' in result && Array.isArray(result.content)) {
		return result.content.map((entry) => {
			if (entry && typeof entry === 'object' && 'type' in entry && entry.type === 'image') {
				const image = entry as { data?: string; mimeType?: string };
				return { type: 'image', base64: image.data, mimeType: image.mimeType };
			}
			if (entry && typeof entry === 'object' && 'type' in entry && entry.type === 'text') {
				return { type: 'text', text: String((entry as { text?: unknown }).text ?? '') };
			}
			return { type: 'text', text: JSON.stringify(entry) };
		});
	}
	if ('toolResult' in result) return [{ type: 'text', text: JSON.stringify(result.toolResult) }];
	return [{ type: 'text', text: JSON.stringify(result) }];
}

function sanitizeName(value: string): string {
	const next = value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
	return next || 'mcp';
}
