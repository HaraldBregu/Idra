import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app, shell } from 'electron';
import { AppsService } from '../../../../src/main/apps';
import { ConnectorsService } from '../../../../src/main/connectors';
import { LoggerService, LogLevel } from '../../../../src/main/logger';
import { UserDataDirectoryService } from '../../../../src/main/user-data';
import { WorkspaceService } from '../../../../src/main/workspace';
import { makeLogger, makeTempDir } from '../test-helpers';

describe('apps service', () => {
	it('lists valid app manifests with embedded icons and validates ids for destructive operations', async () => {
		const tempRoot = await makeTempDir();
		const userDataDirectory = new UserDataDirectoryService({ homePath: tempRoot });
		const service = new AppsService(makeLogger() as never, userDataDirectory);
		const root = service.getAppsRoot();
		await fs.mkdir(path.join(root, 'alpha'), { recursive: true });
		await fs.writeFile(path.join(root, 'alpha', 'icon.png'), Buffer.from('icon'));
		await fs.writeFile(path.join(root, 'alpha', 'manifest.json'), JSON.stringify({ name: 'Alpha', version: '1.0.0', icon: 'icon.png' }));

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
	it('adds, lists, updates, tests, and removes connector configs', async () => {
		let connectors: unknown[] = [];
		const store = {
			getConnectors: jest.fn(() => connectors),
			setConnectors: jest.fn((next: unknown[]) => { connectors = next; }),
		};
		const service = new ConnectorsService(store as never, makeLogger() as never);
		const added = await service.add({
			name: 'My Gmail',
			connectorId: 'connector_gmail',
			authorization: 'token',
			allowedTools: ['get_profile'],
			requireApproval: 'never_for_allowed_tools',
		});

		expect(added.serverLabel).toBe('my_gmail');
		expect(service.list()[0]).toMatchObject({ name: 'My Gmail', status: 'configured', toolsCount: 1 });
		expect(await service.test(added.id)).toMatchObject({ status: 'configured' });
		const updated = await service.disable(added.id);
		expect(updated.enabled).toBe(false);
		expect(await service.test(added.id)).toMatchObject({ status: 'disabled' });
		await service.remove(added.id);
		expect(service.list()).toEqual([]);
		await expect(service.add({ name: 'Bad', connectorId: 'connector_gmail', authorization: 'x', allowedTools: ['missing'] })).rejects.toThrow(/not available/);
	});
});

describe('workspace service', () => {
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

	it('seeds canonical workspace files without overwriting user edits', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });

		await service.ensureReady({ initializeGit: false });
		await expect(fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')).resolves.toContain(
			'Workspace Rules'
		);
		await expect(fs.readFile(path.join(root, 'BOOTSTRAP.md'), 'utf8')).resolves.toContain(
			'First Run'
		);

		await fs.writeFile(path.join(root, 'SOUL.md'), 'custom soul', 'utf8');
		await service.ensureReady({ initializeGit: false });
		await expect(fs.readFile(path.join(root, 'SOUL.md'), 'utf8')).resolves.toBe('custom soul');

		await fs.rm(path.join(root, 'BOOTSTRAP.md'));
		await service.ensureReady({ initializeGit: false });
		await expect(fs.access(path.join(root, 'BOOTSTRAP.md'))).rejects.toThrow();
		await expect(service.isBootstrapPending()).resolves.toBe(false);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('loads only safe canonical workspace files', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });
		await service.ensureReady({ initializeGit: false });

		await fs.rm(path.join(root, 'USER.md'));
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
