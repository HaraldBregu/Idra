import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { StoreService } from '../store';
import type { LoggerService } from '../logger';
import type {
	ConnectorConfig,
	ConnectorInput,
	ConnectorStatus,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorUpdateInput,
	ConnectorView,
} from '../../shared/connectors';

interface JsonRpcMessage {
	jsonrpc: '2.0';
	id?: number;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: { message?: string };
}

const HIGH_RISK_TERMS = [
	'delete',
	'remove',
	'write',
	'exec',
	'shell',
	'terminal',
	'command',
	'file',
	'filesystem',
	'credential',
	'secret',
	'token',
];

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

	if (!name) throw new Error('Connector name is required.');
	if (input.transport !== 'stdio') throw new Error('Only stdio connectors are supported right now.');
	if (!command) throw new Error('Command is required.');

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
		enabled: input.enabled ?? true,
	};
}

function riskForTool(name: string, description?: string): ConnectorTool['risk'] {
	const haystack = `${name} ${description ?? ''}`.toLowerCase();
	return HIGH_RISK_TERMS.some((term) => haystack.includes(term)) ? 'high' : 'low';
}

function parseTools(result: unknown): ConnectorTool[] {
	const tools = typeof result === 'object' && result !== null && 'tools' in result
		? (result as { tools?: unknown }).tools
		: undefined;
	if (!Array.isArray(tools)) return [];

	return tools.flatMap((tool): ConnectorTool[] => {
		if (typeof tool !== 'object' || tool === null) return [];
		const record = tool as { name?: unknown; description?: unknown };
		if (typeof record.name !== 'string' || !record.name.trim()) return [];
		const description = typeof record.description === 'string' ? record.description : undefined;
		return [{ name: record.name, description, risk: riskForTool(record.name, description) }];
	});
}

class McpStdioClient {
	private child: ChildProcessWithoutNullStreams | null = null;
	private buffer = Buffer.alloc(0);
	private nextId = 1;
	private pending = new Map<
		number,
		{ resolve: (value: unknown) => void; reject: (error: Error) => void }
	>();

	constructor(private readonly config: ConnectorConfig) {}

	async connect(): Promise<void> {
		this.child = spawn(this.config.command, this.config.args, {
			cwd: this.config.cwd,
			env: { ...process.env, ...this.config.env },
			stdio: ['pipe', 'pipe', 'pipe'],
			shell: false,
		});

		this.child.stdout.on('data', (chunk: Buffer) => this.handleData(chunk));
		this.child.stderr.on('data', () => {});
		this.child.on('error', (error) => this.rejectAll(error));
		this.child.on('exit', (code) => {
			if (this.pending.size > 0) {
				this.rejectAll(new Error(`Connector process exited with code ${code ?? 'unknown'}.`));
			}
		});

		await this.request('initialize', {
			protocolVersion: '2024-11-05',
			capabilities: {},
			clientInfo: { name: 'Friday', version: '1.0.0' },
		});
		this.notify('notifications/initialized', {});
	}

	async listTools(): Promise<ConnectorTool[]> {
		const result = await this.request('tools/list', {});
		return parseTools(result);
	}

	close(): void {
		this.child?.kill();
		this.child = null;
	}

	private request(method: string, params: unknown): Promise<unknown> {
		const id = this.nextId++;
		this.send({ jsonrpc: '2.0', id, method, params });

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`Connector request timed out: ${method}`));
			}, 8_000);
			this.pending.set(id, {
				resolve: (value) => {
					clearTimeout(timeout);
					resolve(value);
				},
				reject: (error) => {
					clearTimeout(timeout);
					reject(error);
				},
			});
		});
	}

	private notify(method: string, params: unknown): void {
		this.send({ jsonrpc: '2.0', method, params });
	}

	private send(message: JsonRpcMessage): void {
		if (!this.child) throw new Error('Connector process is not running.');
		const body = Buffer.from(JSON.stringify(message), 'utf8');
		this.child.stdin.write(`Content-Length: ${body.byteLength}\r\n\r\n`);
		this.child.stdin.write(body);
	}

	private handleData(chunk: Buffer): void {
		this.buffer = Buffer.concat([this.buffer, chunk]);

		while (true) {
			const headerEnd = this.buffer.indexOf('\r\n\r\n');
			if (headerEnd === -1) return;

			const header = this.buffer.subarray(0, headerEnd).toString('utf8');
			const match = /content-length:\s*(\d+)/i.exec(header);
			if (!match) {
				this.buffer = this.buffer.subarray(headerEnd + 4);
				continue;
			}

			const length = Number(match[1]);
			const messageStart = headerEnd + 4;
			const messageEnd = messageStart + length;
			if (this.buffer.byteLength < messageEnd) return;

			const raw = this.buffer.subarray(messageStart, messageEnd).toString('utf8');
			this.buffer = this.buffer.subarray(messageEnd);
			this.handleMessage(JSON.parse(raw) as JsonRpcMessage);
		}
	}

	private handleMessage(message: JsonRpcMessage): void {
		if (typeof message.id !== 'number') return;
		const pending = this.pending.get(message.id);
		if (!pending) return;
		this.pending.delete(message.id);

		if (message.error) {
			pending.reject(new Error(message.error.message ?? 'Connector request failed.'));
			return;
		}
		pending.resolve(message.result);
	}

	private rejectAll(error: Error): void {
		for (const pending of this.pending.values()) {
			pending.reject(error);
		}
		this.pending.clear();
	}
}

export class ConnectorsService {
	constructor(
		private readonly store: StoreService,
		private readonly logger: LoggerService
	) {}

	list(): ConnectorView[] {
		return this.store.getConnectors().map(toView);
	}

	get(id: string): ConnectorConfig {
		const connector = this.store.getConnectorById(id);
		if (!connector) throw new Error(`Connector not found: ${id}`);
		return connector;
	}

	add(input: ConnectorInput): ConnectorConfig {
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
		return connector;
	}

	update(id: string, input: ConnectorUpdateInput): ConnectorConfig {
		const current = this.get(id);
		const merged = sanitizeInput({
			name: input.name ?? current.name,
			transport: input.transport ?? current.transport,
			command: input.command ?? current.command,
			args: input.args ?? current.args,
			env: input.env ?? current.env,
			cwd: input.cwd ?? current.cwd,
			enabled: input.enabled ?? current.enabled,
		});
		const next: ConnectorConfig = {
			...current,
			...merged,
			updatedAt: new Date().toISOString(),
		};
		this.replace(next);
		return next;
	}

	remove(id: string): void {
		this.store.setConnectors(this.store.getConnectors().filter((connector) => connector.id !== id));
	}

	enable(id: string): ConnectorConfig {
		const connector = { ...this.get(id), enabled: true, updatedAt: new Date().toISOString() };
		this.replace(connector);
		return connector;
	}

	disable(id: string): ConnectorConfig {
		const connector = { ...this.get(id), enabled: false, updatedAt: new Date().toISOString() };
		this.replace(connector);
		return connector;
	}

	async test(id: string): Promise<ConnectorTestResult> {
		const connector = this.get(id);
		try {
			await this.withClient(connector, async () => undefined);
			this.setStatus(id, 'connected');
			return { status: 'connected', message: 'Connected' };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.warn('ConnectorsService', `Test failed for ${connector.name}: ${message}`);
			this.setStatus(id, 'error', message);
			return { status: 'error', message };
		}
	}

	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.get(id);
		const tools = await this.withClient(connector, (client) => client.listTools());
		this.replace({
			...connector,
			connectionStatus: 'connected',
			tools,
			lastRefreshedAt: new Date().toISOString(),
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		});
		return tools;
	}

	listTools(id: string): ConnectorTool[] {
		return this.get(id).tools;
	}

	private async withClient<T>(
		connector: ConnectorConfig,
		run: (client: McpStdioClient) => Promise<T>
	): Promise<T> {
		if (connector.transport !== 'stdio') {
			throw new Error('Only stdio connectors are supported right now.');
		}
		const client = new McpStdioClient(connector);
		try {
			await client.connect();
			return await run(client);
		} finally {
			client.close();
		}
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
