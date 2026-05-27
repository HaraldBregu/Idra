import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app, shell } from 'electron';
import { AppsService } from '../../../../src/main/apps';
import { ConnectorsService } from '../../../../src/main/agent/connectors';
import { LoggerService, LogLevel } from '../../../../src/main/logger';
import { UserDataDirectoryService } from '../../../../src/main/user-data';
import { WorkspaceService } from '../../../../src/main/workspace';
import { AgentStartupFilesService } from '../../../../src/main/agent';
import { makeLogger, makeTempDir } from '../test-helpers';

function connectorStoreFor(
	read: () => unknown[],
	write: (connectors: unknown[]) => void
): { get: jest.Mock; set: jest.Mock; delete: jest.Mock } {
	return {
		get: jest.fn((key: string) => (key === 'connectors' ? read() : undefined)),
		set: jest.fn((key: string, value: unknown) => {
			if (key === 'connectors' && Array.isArray(value)) write(value);
		}),
		delete: jest.fn((key: string) => {
			if (key === 'connectors') write([]);
		}),
	};
}

describe('apps service', () => {
	it('lists valid app manifests with embedded icons and validates ids for destructive operations', async () => {
		const tempRoot = await makeTempDir();
		const userDataDirectory = new UserDataDirectoryService({ homePath: tempRoot });
		const service = new AppsService(makeLogger() as never, userDataDirectory);
		const root = service.getAppsRoot();
		await fs.mkdir(path.join(root, 'alpha'), { recursive: true });
		await fs.writeFile(path.join(root, 'alpha', 'icon.png'), Buffer.from('icon'));
		await fs.writeFile(
			path.join(root, 'alpha', 'manifest.json'),
			JSON.stringify({ name: 'Alpha', version: '1.0.0', icon: 'icon.png' })
		);

		const apps = await service.list();
		expect(apps).toHaveLength(1);
		expect(apps[0]?.iconDataUrl).toContain('data:image/png;base64');

		await service.openFolder('alpha');
		expect(shell.openPath).toHaveBeenCalledWith(path.join(root, 'alpha'));
		(shell.openPath as jest.Mock).mockResolvedValueOnce('permission denied');
		await expect(service.openFolder('alpha')).rejects.toThrow(/Could not open app folder/);
		await expect(service.delete('../bad')).rejects.toThrow(/Invalid app id/);
		await fs.rm(tempRoot, { recursive: true, force: true });
	});
});

describe('connectors service', () => {
	function fakeMcpClient() {
		return {
			listTools: jest.fn(async () => [
				{
					name: 'search',
					description: 'Search remotely discovered data.',
					inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
					requiresApproval: false,
				},
				{
					name: 'write_note',
					description: 'Write a note.',
					inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
					requiresApproval: false,
				},
			]),
			callTool: jest.fn(async (name: string, args: Record<string, unknown>) => ({ name, args })),
			close: jest.fn(async () => undefined),
		};
	}

	it('adds, lists, updates, tests, and removes dynamic MCP connector configs', async () => {
		let connectors: unknown[] = [];
		const store = connectorStoreFor(
			() => connectors,
			(next) => {
				connectors = next;
			}
		);
		const client = fakeMcpClient();
		const service = new ConnectorsService(makeLogger() as never, {
			store: store as never,
			mcpClientFactory: jest.fn(() => client),
		});
		const added = await service.add({
			name: 'Remote Gmail',
			connectorId: 'connector_gmail',
			serverLabel: 'remote_gmail',
			allowedTools: ['search'],
			requireApproval: 'never_for_allowed_tools',
			mcp: { transport: 'http', url: 'https://mcp.example.test/mcp' },
		});

		expect(added.serverLabel).toBe('remote_gmail');
		expect(added.authorization).toBe('');
		expect(service.get(added.id).authorization).toBe('');
		expect(connectors[0]).toMatchObject({
			connectorId: 'connector_gmail',
			mcp: { transport: 'http', url: 'https://mcp.example.test/mcp/' },
		});
		expect(service.list()[0]).toMatchObject({
			name: 'Remote Gmail',
			status: 'configured',
			toolsCount: 1,
			authKind: 'mcp_env',
		});
		expect(await service.test(added.id)).toMatchObject({ status: 'configured' });
		await expect(service.callTool(added.id, 'search', { query: 'report' })).resolves.toEqual({
			name: 'search',
			args: { query: 'report' },
		});
		const updated = await service.disable(added.id);
		expect(updated.enabled).toBe(false);
		expect(await service.test(added.id)).toMatchObject({ status: 'disabled' });
		await service.remove(added.id);
		expect(service.list()).toEqual([]);
	});

	it('allows more than one configured connector per provider id', async () => {
		let connectors: unknown[] = [];
		const store = connectorStoreFor(
			() => connectors,
			(next) => {
				connectors = next;
			}
		);
		const service = new ConnectorsService(makeLogger() as never, {
			store: store as never,
			mcpClientFactory: jest.fn(() => fakeMcpClient()),
		});

		await service.add({
			name: 'Work Gmail',
			connectorId: 'connector_gmail',
			serverLabel: 'work_gmail',
			mcp: { transport: 'http', url: 'https://work.example.test/mcp' },
		});
		await service.add({
			name: 'Personal Gmail',
			connectorId: 'connector_gmail',
			serverLabel: 'personal_gmail',
			mcp: { transport: 'http', url: 'https://personal.example.test/mcp' },
		});

		expect(service.list().map((connector) => connector.name)).toEqual(['Work Gmail', 'Personal Gmail']);
	});

	it('validates MCP connector payloads before storing them', async () => {
		let connectors: unknown[] = [];
		const store = connectorStoreFor(
			() => connectors,
			(next) => {
				connectors = next;
			}
		);
		const service = new ConnectorsService(makeLogger() as never, { store: store as never });

		await expect(service.add(undefined)).rejects.toThrow(/Connector configuration is required/);
		await expect(
			service.add({ name: 'Bad', connectorId: 'connector_gmail', allowedTools: ['search', 42] })
		).rejects.toThrow(/allowedTools must be an array of strings/);
		await expect(
			service.add({
				name: 'Bad',
				connectorId: 'connector_gmail',
				authorization: 'token',
				mcp: { transport: 'http', url: 'https://mcp.example.test/mcp' },
			})
		).rejects.toThrow(/environment variables/);
		await expect(
			service.add({
				name: 'Bad',
				connectorId: 'connector_gmail',
				mcp: { transport: 'http', url: 'https://mcp.example.test/mcp', headers: { Authorization: 'token' } },
			})
		).rejects.toThrow(/secret headers/);
	});

	it('reports missing secret env vars instead of storing API keys', async () => {
		let connectors: unknown[] = [];
		const store = connectorStoreFor(
			() => connectors,
			(next) => {
				connectors = next;
			}
		);
		const client = fakeMcpClient();
		const service = new ConnectorsService(makeLogger() as never, {
			store: store as never,
			mcpClientFactory: jest.fn(() => client),
		});
		const added = await service.add({
			name: 'Remote MCP',
			connectorId: 'connector_remote_mcp',
			serverLabel: 'remote',
			mcp: {
				transport: 'http',
				url: 'https://mcp.example.test/mcp',
				auth: { env: 'REMOTE_MCP_API_KEY' },
			},
		});

		expect(client.listTools).not.toHaveBeenCalled();
		expect(service.list()[0]).toMatchObject({ status: 'missing_auth' });
		await expect(service.refreshTools(added.id)).rejects.toThrow('REMOTE_MCP_API_KEY');
	});
});

function jsonResponse(payload: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => payload,
		text: async () => JSON.stringify(payload),
	} as Response;
}

function textResponse(payload: string, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => JSON.parse(payload),
		text: async () => payload,
	} as Response;
}

describe('workspace service', () => {
	const startupStatePath = (agentRoot: string): string =>
		path.join(agentRoot, '.friday', 'startup-state.json');
	const readStartupState = async (
		agentRoot: string
	): Promise<{ bootstrapSeededAt?: string; setupCompletedAt?: string }> =>
		JSON.parse(await fs.readFile(startupStatePath(agentRoot), 'utf8')) as {
			bootstrapSeededAt?: string;
			setupCompletedAt?: string;
		};

	it('confines reads and writes to the configured root', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });
		await service.writeText('nested/file.txt', 'hello');
		await expect(service.readText('nested/file.txt')).resolves.toBe('hello');
		await service.writeJson('data.json', { ok: true });
		await expect(service.readJson('data.json')).resolves.toEqual({ ok: true });
		expect(() => service.resolvePath('..', 'outside')).toThrow(/outside root/);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('does not seed agent startup files into the workspace root', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });

		await service.ensureReady({ initializeGit: false });
		await expect(fs.access(path.join(root, 'AGENTS.md'))).rejects.toThrow();
		await expect(fs.access(path.join(root, 'BOOTSTRAP.md'))).rejects.toThrow();
		await fs.rm(root, { recursive: true, force: true });
	});

	it('seeds agent startup files under .friday/agent without overwriting user edits', async () => {
		const root = await makeTempDir();
		const service = new AgentStartupFilesService({
			rootPath: path.join(root, 'agent', 'workspaces'),
		});

		await service.ensureReady('main');
		const agentRoot = service.getRootPath('main');
		expect(agentRoot).toBe(path.join(root, 'agent', 'workspaces', 'main'));
		await expect(fs.readFile(path.join(agentRoot, 'AGENTS.md'), 'utf8')).resolves.toContain(
			'startup context'
		);
		await expect(fs.readFile(path.join(agentRoot, 'BOOTSTRAP.md'), 'utf8')).resolves.toContain(
			'First Run'
		);

		await service.writeFile('main', 'SOUL.md', 'custom soul');
		await service.ensureReady('main');
		await expect(fs.readFile(path.join(agentRoot, 'SOUL.md'), 'utf8')).resolves.toBe('custom soul');
		await expect(fs.access(path.join(root, 'AGENTS.md'))).rejects.toThrow();

		await service.completeBootstrap('main');
		await service.ensureReady('main');
		await expect(fs.access(path.join(agentRoot, 'BOOTSTRAP.md'))).rejects.toThrow();
		await expect(service.isBootstrapPending('main')).resolves.toBe(false);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('does not create agent BOOTSTRAP.md for already configured startup workspaces', async () => {
		const root = await makeTempDir();
		const service = new AgentStartupFilesService({
			rootPath: path.join(root, 'agent', 'workspaces'),
		});
		const agentRoot = service.getRootPath('main');
		await fs.mkdir(agentRoot, { recursive: true });
		await fs.writeFile(path.join(agentRoot, 'IDENTITY.md'), 'custom identity', 'utf8');

		await service.ensureReady('main');

		await expect(fs.access(path.join(agentRoot, 'BOOTSTRAP.md'))).rejects.toThrow();
		const state = await readStartupState(agentRoot);
		expect(state.bootstrapSeededAt).toBeUndefined();
		expect(state.setupCompletedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('records agent setup completion when seeded BOOTSTRAP.md is deleted', async () => {
		const root = await makeTempDir();
		const service = new AgentStartupFilesService({
			rootPath: path.join(root, 'agent', 'workspaces'),
		});
		const agentRoot = service.getRootPath('main');

		await service.ensureReady('main');
		await fs.unlink(path.join(agentRoot, 'BOOTSTRAP.md'));
		await service.ensureReady('main');

		await expect(fs.access(path.join(agentRoot, 'BOOTSTRAP.md'))).rejects.toThrow();
		expect((await readStartupState(agentRoot)).setupCompletedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
		await expect(service.isBootstrapPending('main')).resolves.toBe(false);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('repairs stale agent BOOTSTRAP.md when profile files show setup completed', async () => {
		const root = await makeTempDir();
		const service = new AgentStartupFilesService({
			rootPath: path.join(root, 'agent', 'workspaces'),
		});
		const agentRoot = service.getRootPath('main');

		await service.ensureReady('main');
		await fs.writeFile(path.join(agentRoot, 'USER.md'), 'custom user', 'utf8');
		await service.ensureReady('main');

		await expect(fs.access(path.join(agentRoot, 'BOOTSTRAP.md'))).rejects.toThrow();
		const state = await readStartupState(agentRoot);
		expect(state.bootstrapSeededAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
		expect(state.setupCompletedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('loads only safe canonical workspace files', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });
		await service.ensureReady({ initializeGit: false });

		await fs.rm(path.join(root, 'USER.md'), { force: true });
		await fs.symlink(path.join(root, 'AGENTS.md'), path.join(root, 'USER.md'));
		const loaded = await service.readWorkspaceFile('USER.md');

		expect(loaded).toMatchObject({ name: 'USER.md', missing: true, error: 'unsafe' });
		await expect(service.readWorkspaceFile('../outside')).rejects.toThrow(/Unsupported/);
		await fs.rm(root, { recursive: true, force: true });
	});
});

describe('logger service', () => {
	it('buffers recent logs and flushes to the current log file', async () => {
		const userData = await makeTempDir();
		(app.getPath as jest.Mock).mockImplementation((name: string) => path.join(userData, name));
		const logger = new LoggerService(null, {
			minLevel: LogLevel.DEBUG,
			consoleOutput: false,
			flushInterval: 60_000,
			maxBufferSize: 10,
		});
		logger.info('Test', 'hello', { value: 1 });
		expect(logger.getRecentLogs(1)[0]).toMatchObject({
			source: 'Test',
			message: 'hello {"value":1}',
		});
		logger.flush();
		const file = logger.getCurrentLogFile();
		expect(file).toBeTruthy();
		await expect(fs.readFile(file!, 'utf8')).resolves.toContain('[Test] hello');
		logger.destroy();
		await fs.rm(userData, { recursive: true, force: true });
	});
});
