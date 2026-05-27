import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
	ConnectorCallToolOptions,
	ConnectorConfig,
	ConnectorMcpConfig,
	ConnectorTool,
} from '../../shared/connector';
import { DEFAULT_CONNECTOR_TOOL_PERMISSION } from '../../shared/connector';
import type { JSONSchema } from '../provider/types';

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
	method?: 'POST';
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
		const resolved = resolveMcpConfig(this.connector);
		if (resolved.transport === 'http') return listToolsOverHttp(resolved, options);
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
					permission: DEFAULT_CONNECTOR_TOOL_PERMISSION,
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
	if (mcp.transport === 'http') return resolveHttpConfig(connector, mcp, env);
	return resolveStdioConfig(mcp, env);
}

function resolveHttpConfig(
	connector: ConnectorConfig,
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
		} else if (connector.oauth?.token?.accessToken) {
			headers.Authorization = 'Bearer ' + connector.oauth.token.accessToken;
		} else if (connector.authorization.trim()) {
			headers.Authorization = connector.authorization.trim();
		}
	return {
		transport: 'http',
		url: mcp.url,
		method: mcp.method,
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

async function listToolsOverHttp(
	config: ResolvedHttpMcpConfig,
	options?: ConnectorCallToolOptions
): Promise<ConnectorTool[]> {
	const tools: ConnectorTool[] = [];
	let cursor: string | undefined;
	let id = 1;
	do {
		const result = await postHttpMcpJsonRpc(config, {
			jsonrpc: '2.0',
			id: id++,
			method: 'tools/list',
			...(cursor ? { params: { cursor } } : {}),
		}, options);
		const record = readRecord(result.result);
		if (!record) throw new Error('MCP tools/list response is missing a result object.');
		const rawTools = record.tools;
		if (!Array.isArray(rawTools)) throw new Error('MCP tools/list response is missing tools.');
		tools.push(...rawTools.flatMap(readToolRecord));
		cursor = typeof record.nextCursor === 'string' && record.nextCursor ? record.nextCursor : undefined;
	} while (cursor);
	return tools;
}

async function postHttpMcpJsonRpc(
	config: ResolvedHttpMcpConfig,
	body: Record<string, unknown>,
	options?: ConnectorCallToolOptions
): Promise<Record<string, unknown>> {
	const fetchImpl = globalThis.fetch;
	if (!fetchImpl) throw new Error('Global fetch is unavailable for HTTP MCP connector.');
	const controller = options?.timeoutMs ? new AbortController() : undefined;
	const timeout = controller && options?.timeoutMs
		? setTimeout(() => controller.abort(), options.timeoutMs)
		: undefined;
	try {
		const response = await fetchImpl(config.url, {
			method: config.method ?? 'POST',
			headers: {
				accept: 'application/json, text/event-stream',
				'content-type': 'application/json',
				...(config.headers ?? {}),
			},
			body: JSON.stringify(body),
			signal: controller?.signal,
		});
		const text = await response.text();
		if (!response.ok) throw new Error('MCP tools/list failed with HTTP ' + response.status + ': ' + text);
		const payload = parseJsonRpcPayload(text);
		if (payload.error) {
			const error = readRecord(payload.error);
			const message = typeof error?.message === 'string' ? error.message : 'MCP tools/list failed.';
			throw new Error(message);
		}


		console.log()

		return payload;
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

function parseJsonRpcPayload(text: string): Record<string, unknown> {
	try {
		const payload = JSON.parse(text);
		if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
			return payload as Record<string, unknown>;
		}
	} catch {
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('data:')) continue;
			const data = trimmed.slice(5).trim();
			if (!data || data === '[DONE]') continue;
			try {
				const payload = JSON.parse(data);
				if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
					return payload as Record<string, unknown>;
				}
			} catch {
				continue;
			}
		}
	}
	throw new Error('MCP tools/list response was not valid JSON.');
}

function readToolRecord(value: unknown): ConnectorTool[] {
	const record = readRecord(value);
	if (!record) return [];
	const name = typeof record.name === 'string' ? record.name.trim() : '';
	if (!name) return [];
	return [{
		name,
		description: typeof record.description === 'string' ? record.description : undefined,
		inputSchema: normalizeInputSchema(record.inputSchema),
		permission: DEFAULT_CONNECTOR_TOOL_PERMISSION,
		requiresApproval: false,
	}];
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
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
