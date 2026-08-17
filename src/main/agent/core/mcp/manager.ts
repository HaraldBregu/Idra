import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from '../../types';
import { mcpResult } from './result';
import type { McpServerConfig } from './types';

interface Connection {
	client: Client;
	transport: StdioClientTransport;
}

export class McpManager {
	private readonly connections: Connection[] = [];
	private loading?: Promise<Tool[]>;
	readonly errors: Error[] = [];

	constructor(private readonly servers: McpServerConfig[]) {}

	tools(): Promise<Tool[]> {
		this.loading ??= this.load();
		return this.loading;
	}

	async close(): Promise<void> {
		await Promise.allSettled(this.connections.map(({ client }) => client.close()));
		this.connections.length = 0;
		this.loading = undefined;
	}

	private async load(): Promise<Tool[]> {
		const discovered = await Promise.all(
			this.servers.map((server) =>
				this.connect(server).catch((error) => {
					this.errors.push(error instanceof Error ? error : new Error(String(error)));
					return [];
				})
			)
		);
		return discovered.flat();
	}

	private async connect(server: McpServerConfig): Promise<Tool[]> {
		const client = new Client({ name: 'idra', version: '1.0.2' });
		const transport = new StdioClientTransport({
			command: server.command,
			args: server.args,
			cwd: server.cwd,
			env: { ...getDefaultEnvironment(), ...server.env },
			stderr: 'pipe',
		});
		try {
			await client.connect(transport);
			this.connections.push({ client, transport });
			const { tools } = await client.listTools();
			return tools.map((candidate): Tool => ({
				id: `mcp__${server.id}__${candidate.name}`,
				name: candidate.annotations?.title ?? candidate.name,
				description: candidate.description ?? `MCP tool ${candidate.name}`,
				schema: candidate.inputSchema,
				parseInput(input: unknown): Record<string, unknown> {
					if (!input || typeof input !== 'object' || Array.isArray(input)) {
						throw new Error('MCP tool input must be an object.');
					}
					return input as Record<string, unknown>;
				},
				async run(input: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
					const result = await client.callTool(
						{ name: candidate.name, arguments: input },
						undefined,
						{ signal, timeout: 120_000 }
					);
					return mcpResult(result);
				},
			}));
		} catch (error) {
			await transport.close().catch(() => undefined);
			throw new Error(`Failed to connect MCP server '${server.id}': ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
