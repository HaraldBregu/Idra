import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app } from 'electron';
import { LoggerService, LogLevel } from '../../../../src/main/observability';
import { WorkspaceService } from '../../../../src/main/agent/workspace';
import { AgentStartupFilesService } from '../../../../src/main/agent/workspace';
import { makeLogger, makeTempDir } from '../test-helpers';

describe('workspace service', () => {
	const workspaceSetupStatePath = (workspaceRoot: string): string =>
		path.join(workspaceRoot, 'workspace-state.json');

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

	it('stores completed workspace bootstrap state', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });
		await service.ensureReady({ initializeGit: false });
		await fs.writeFile(path.join(root, 'BOOTSTRAP.md'), 'First Run', 'utf8');

		await expect(service.isBootstrapPending()).resolves.toBe(true);
		await service.completeBootstrap();

		await expect(fs.access(path.join(root, 'BOOTSTRAP.md'))).rejects.toThrow();
		await expect(fs.readFile(workspaceSetupStatePath(root), 'utf8')).resolves.toContain(
			'setupCompletedAt'
		);
		await expect(service.loadContextFiles()).resolves.toEqual(
			expect.not.arrayContaining([expect.objectContaining({ name: 'BOOTSTRAP.md' })])
		);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('seeds agent startup files under agent workspace data without overwriting user edits', async () => {
		const root = await makeTempDir();
		const service = new AgentStartupFilesService({ rootPath: path.join(root, 'agent', 'workspaces') });

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
		const service = new AgentStartupFilesService({ rootPath: path.join(root, 'agent', 'workspaces') });
		const agentRoot = service.getRootPath('main');
		await fs.mkdir(agentRoot, { recursive: true });
		await fs.writeFile(path.join(agentRoot, 'IDENTITY.md'), 'custom identity', 'utf8');

		await service.ensureReady('main');

		await expect(fs.access(path.join(agentRoot, 'BOOTSTRAP.md'))).rejects.toThrow();
		await fs.rm(root, { recursive: true, force: true });
	});

	it('does not recreate seeded agent BOOTSTRAP.md when it is deleted', async () => {
		const root = await makeTempDir();
		const service = new AgentStartupFilesService({ rootPath: path.join(root, 'agent', 'workspaces') });
		const agentRoot = service.getRootPath('main');

		await service.ensureReady('main');
		await fs.unlink(path.join(agentRoot, 'BOOTSTRAP.md'));
		await service.ensureReady('main');

		await expect(fs.access(path.join(agentRoot, 'BOOTSTRAP.md'))).rejects.toThrow();
		await expect(service.isBootstrapPending('main')).resolves.toBe(false);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('repairs stale agent BOOTSTRAP.md when profile files show setup completed', async () => {
		const root = await makeTempDir();
		const service = new AgentStartupFilesService({ rootPath: path.join(root, 'agent', 'workspaces') });
		const agentRoot = service.getRootPath('main');

		await service.ensureReady('main');
		await fs.writeFile(path.join(agentRoot, 'USER.md'), 'custom user', 'utf8');
		await service.ensureReady('main');

		await expect(fs.access(path.join(agentRoot, 'BOOTSTRAP.md'))).rejects.toThrow();
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
		expect(logger.getRecentLogs(1)[0]).toMatchObject({ source: 'Test', message: 'hello {"value":1}' });
		logger.flush();
		const file = logger.getCurrentLogFile();
		expect(file).toBeTruthy();
		await expect(fs.readFile(file!, 'utf8')).resolves.toContain('[Test] hello');
		logger.destroy();
		await fs.rm(userData, { recursive: true, force: true });
	});
});
