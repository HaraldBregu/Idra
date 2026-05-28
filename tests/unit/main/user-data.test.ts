import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import {
	USER_DATA_DIRECTORY_NAME,
	UserDataDirectoryService,
} from '../../../src/main/user-data';
import { loadSession, saveSession } from '../../../src/main/session/store';
import { makeTempDir } from './test-helpers';

describe('UserDataDirectoryService', () => {
	it('resolves .friday under the injected home folder', () => {
		const service = new UserDataDirectoryService({ homePath: '/tmp/home' });

		expect(service.getRootPath()).toBe(path.join('/tmp/home', USER_DATA_DIRECTORY_NAME));
		expect(service.resolve('agent', 'sessions')).toBe(
			path.join('/tmp/home', USER_DATA_DIRECTORY_NAME, 'agent', 'sessions')
		);
	});

	it('uses Electron home for the default root path', async () => {
		const home = await makeTempDir();
		(app.getPath as jest.Mock).mockImplementation((name: string) => {
			if (name === 'home') return home;
			return path.join(home, name);
		});

		const service = new UserDataDirectoryService();

		expect(service.getRootPath()).toBe(path.join(home, USER_DATA_DIRECTORY_NAME));
		await fs.rm(home, { recursive: true, force: true });
	});

	it('creates the root idempotently and rejects traversal', async () => {
		const parent = await makeTempDir();
		const service = new UserDataDirectoryService({ homePath: parent });

		await expect(service.ensureRoot()).resolves.toBe(path.join(parent, USER_DATA_DIRECTORY_NAME));
		await expect(service.ensureRoot()).resolves.toBe(path.join(parent, USER_DATA_DIRECTORY_NAME));
		await expect(fs.access(service.getRootPath())).resolves.toBeUndefined();
		expect(() => service.resolve('..', 'outside')).toThrow(/cannot traverse/);
		expect(() => service.resolve('folder/../outside')).toThrow(/cannot traverse/);
		expect(() => service.resolve(path.join(parent, 'outside'))).toThrow(/must be relative/);

		await fs.rm(parent, { recursive: true, force: true });
	});

	it('rejects existing symlink escapes', async () => {
		const parent = await makeTempDir();
		const service = new UserDataDirectoryService({ homePath: parent });
		const outside = path.join(parent, 'outside');
		await service.ensureRoot();
		await fs.mkdir(outside, { recursive: true });
		await fs.symlink(outside, service.resolve('linked-outside'));

		await expect(service.resolveExisting('linked-outside')).rejects.toThrow(/outside root/);
		await fs.rm(parent, { recursive: true, force: true });
	});
});

describe('session store user data path', () => {
	it('uses .friday for default agent sessions without reading legacy app data', async () => {
		const parent = await makeTempDir();
		const appData = path.join(parent, 'appData');
		const legacySessions = path.join(appData, 'agent', 'sessions');
		const nextSessions = path.join(parent, USER_DATA_DIRECTORY_NAME, 'agent', 'sessions');
		(app.getPath as jest.Mock).mockImplementation((name: string) => {
			if (name === 'home') return parent;
			if (name === 'userData') return appData;
			return path.join(parent, name);
		});
		await fs.mkdir(legacySessions, { recursive: true });
		await fs.writeFile(
			path.join(legacySessions, 'main.json'),
			JSON.stringify({
				id: 'main',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
				model: 'gpt-test',
				provider: 'openai',
				transcript: [],
				plan: [],
				compactionMarkers: [],
			})
		);

		const created = await loadSession('main', 'gpt-new', 'openai');
		expect(created).toMatchObject({
			id: 'main',
			model: 'gpt-new',
		});
		await saveSession(created);
		await expect(fs.access(path.join(nextSessions, 'main.json'))).resolves.toBeUndefined();
		await expect(fs.readFile(path.join(nextSessions, 'main.json'), 'utf8')).resolves.toContain(
			'gpt-new'
		);

		await fs.rm(parent, { recursive: true, force: true });
	});
});
