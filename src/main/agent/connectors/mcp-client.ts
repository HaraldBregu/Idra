import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
	ConnectorCallToolOptions,
	ConnectorConfig,
	ConnectorMcpConfig,
	ConnectorTool,
} from '../../../shared/connector';
import type { JSONSchema } from '../../provider/types';

export interface ConnectorMcpClient {
	listTools(options?: ConnectorCallToolOptions): Promise<ConnectorTool[]>;
	callTool(name: string, args: Record<string, unknown>, options?: ConnectorCallToolOptions): Promise<unknown>;
	listResources(options?: ConnectorCallToolOptions): Promise<unknown>;
	readResource(uri: string, options?: ConnectorCallToolOptions): Promise<unknown>;
	listPrompts(options?: ConnectorCallToolOptions): Promise<unknown>;
	getPrompt(
		name: string,
		args: Record<string, unknown>,
		options?: ConnectorCallToolOptions
	): Promise<unknown>;
	close(): Promise<void>;
}

export type ConnectorMcpClientFactory = (connector: ConnectorConfig) => ConnectorMcpClient;

interface ResolvedHttpMcpConfig {
	transport: 'http';
	url: string;
	headers?: Record<string, string>;
	sessionId?: string;
}

interface ResolvedStdioMcpConfig {
	transport: 'stdio';
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
}

type ResolvedMcpConfig = ResolvedHttpMcpConfig | ResolvedStdioMcpConfig;

export class SdkConnectorMcpClient implements ConnectorMcpClient {
	private readonly client = new Client({ name: 'friday-connector-mcp', version: '1.0.0' });
	private transport: Transport | null = null;
	private connected = false;

	constructor(private readonly connector: ConnectorConfig) {}

	async listTools(options?: ConnectorCallToolOptions): Promise<ConnectorTool[]> {
		await this.connect(options);
		const tools: ConnectorTool[] = [];
		let cursor: string | undefined;
		do {
			const result = await this.client.listTools(cursor ? { cursor } : undefined, {
				timeout: options?.timeoutMs,
			});
			tools.push(
				...result.tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					inputSchema: normalizeInputSchema(tool.inputSchema),
					requiresApproval: false,
				}))
			);
			cursor = result.nextCursor;
		} while (cursor);
		return tools;
	}

	async callTool(
		name: string,
		args: Record<string, unknown>,
		options?: ConnectorCallToolOptions
	): Promise<unknown> {
		await this.connect(options);
		return this.client.callTool(
			{ name, arguments: args },
			undefined,
			{ timeout: options?.timeoutMs, resetTimeoutOnProgress: true }
		);
	}

	async listResources(options?: ConnectorCallToolOptions): Promise<unknown> {
		await this.connect(options);
		const resources: unknown[] = [];
		let cursor: string | undefined;
		do {
			const result = await this.client.listResources(cursor ? { cursor } : undefined, {
				timeout: options?.timeoutMs,
			});
			resources.push(...result.resources);
			cursor = result.nextCursor;
		} while (cursor);
		return resources;
	}

	async readResource(uri: string, options?: ConnectorCallToolOptions): Promise<unknown> {
		await this.connect(options);
		return this.client.readResource({ uri }, { timeout: options?.timeoutMs });
	}

	async listPrompts(options?: ConnectorCallToolOptions): Promise<unknown> {
		await this.connect(options);
		const prompts: unknown[] = [];
		let cursor: string | undefined;
		do {
			const result = await this.client.listPrompts(cursor ? { cursor } : undefined, {
				timeout: options?.timeoutMs,
			});
			prompts.push(...result.prompts);
			cursor = result.nextCursor;
		} while (cursor);
		return prompts;
	}

	async getPrompt(
		name: string,
		args: Record<string, unknown>,
		options?: ConnectorCallToolOptions
	): Promise<unknown> {
		await this.connect(options);
		return this.client.getPrompt({ name, arguments: stringArguments(args) }, { timeout: options?.timeoutMs });
	}

	async close(): Promise<void> {
		await this.client.close().catch(() => undefined);
		await this.transport?.close().catch(() => undefined);
		this.connected = false;
		this.transport = null;
	}

	private async connect(options?: ConnectorCallToolOptions): Promise<void> {
		if (this.connected) return;
		const resolved = resolveMcpConfig(this.connector);
		this.transport = createTransport(resolved);
		await this.client.connect(this.transport, { timeout: options?.timeoutMs });
		this.connected = true;
	}
}

export function createSdkConnectorMcpClient(connector: ConnectorConfig): ConnectorMcpClient {
	return new SdkConnectorMcpClient(connector);
}

export function missingMcpSecretNames(
	connector: ConnectorConfig,
	env: NodeJS.ProcessEnv = process.env
): string[] {
	const mcp = connector.mcp;
	if (!mcp) return [];
	if (mcp.transport === 'http') {
		const secret = mcp.auth?.env?.trim();
		return secret && !env[secret] ? [secret] : [];
	}
	return (mcp.envSecrets ?? [])
		.map((secret) => secret.env.trim())
		.filter((name) => name && !env[name]);
}

export function resolveMcpConfig(
	connector: ConnectorConfig,
	env: NodeJS.ProcessEnv = process.env
): ResolvedMcpConfig {
	const mcp = connector.mcp;
	if (!mcp) throw new Error('Connector ' + connector.name + ' is missing MCP transport configuration.');
	if (mcp.transport === 'http') return resolveHttpConfig(mcp, env);
	return resolveStdioConfig(mcp, env);
}

function resolveHttpConfig(
	mcp: Extract<ConnectorMcpConfig, { transport: 'http' }>,
	env: NodeJS.ProcessEnv
): ResolvedHttpMcpConfig {
	const headers = { ...(mcp.headers ?? {}) };
	const authEnv = mcp.auth?.env?.trim();
	if (authEnv) {
		const secret = env[authEnv];
		if (!secret) throw new Error('Missing MCP secret environment variable: ' + authEnv);
		const header = mcp.auth?.header?.trim() || 'Authorization';
		const scheme = mcp.auth?.scheme ?? 'bearer';
		headers[header] = header.toLowerCase() === 'authorization' && scheme === 'bearer'
			? 'Bearer ' + secret
			: secret;
	}
	return {
		transport: 'http',
		url: mcp.url,
		headers: Object.keys(headers).length > 0 ? headers : undefined,
		sessionId: mcp.sessionId,
	};
}

function resolveStdioConfig(
	mcp: Extract<ConnectorMcpConfig, { transport: 'stdio' }>,
	env: NodeJS.ProcessEnv
): ResolvedStdioMcpConfig {
	const resolvedEnv = { ...(mcp.env ?? {}) };
	for (const secret of mcp.envSecrets ?? []) {
		const source = secret.env.trim();
		const target = secret.target.trim();
		if (!source || !target) continue;
		const value = env[source];
		if (!value) throw new Error('Missing MCP secret environment variable: ' + source);
		resolvedEnv[target] = value;
	}
	return {
		transport: 'stdio',
		command: mcp.command,
		args: mcp.args,
		cwd: mcp.cwd,
		env: Object.keys(resolvedEnv).length > 0 ? resolvedEnv : undefined,
	};
}

function createTransport(config: ResolvedMcpConfig): Transport {
	if (config.transport === 'stdio') {
		return new StdioClientTransport({
			command: config.command,
			args: config.args,
			cwd: config.cwd,
			env: config.env,
			stderr: 'pipe',
		});
	}
	return new StreamableHTTPClientTransport(new URL(config.url), {
		sessionId: config.sessionId,
		requestInit: config.headers ? { headers: config.headers } : undefined,
	});
}

function normalizeInputSchema(value: unknown): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as JSONSchema;
	}
	return { type: 'object', properties: {}, additionalProperties: true };
}

function stringArguments(args: Record<string, unknown>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(args).map(([key, value]) => [
			key,
			typeof value === 'string' ? value : JSON.stringify(value),
		])
	);
}
