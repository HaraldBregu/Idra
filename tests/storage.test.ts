import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Fastify from 'fastify';
import { registerStorageRoutes } from '../src/server/storage/routes';

test('storage API manages persistent settings and files inside the data directory', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-storage-'));
	const outsideFile = path.join(directory, '..', `idra-outside-${path.basename(directory)}.txt`);
	const server = Fastify();
	registerStorageRoutes(server, directory);

	try {
		const initial = await server.inject({ method: 'GET', url: '/storage' });
		assert.equal(initial.statusCode, 200);
		assert.deepEqual(initial.json(), {
			dataDirectory: directory,
			settings: { path: 'settings.json', exists: false },
			files: { directory: 'files', count: 0 },
		});

		const settings = await server.inject({
			method: 'PUT',
			url: '/settings',
			payload: { settings: { theme: 'dark', nested: { enabled: true } } },
		});
		assert.equal(settings.statusCode, 200);
		assert.deepEqual(settings.json(), {
			exists: true,
			settings: { theme: 'dark', nested: { enabled: true } },
		});

		const created = await server.inject({
			method: 'PUT',
			url: '/files',
			payload: { path: 'notes/example.txt', content: 'persistent content' },
		});
		assert.equal(created.statusCode, 201);
		assert.deepEqual(created.json(), {
			created: true,
			file: { path: 'notes/example.txt', size: 18 },
		});

		const restartedServer = Fastify();
		registerStorageRoutes(restartedServer, directory);
		try {
			const persistedSettings = await restartedServer.inject({ method: 'GET', url: '/settings' });
			assert.deepEqual(persistedSettings.json(), settings.json());
			const persistedFile = await restartedServer.inject({
				method: 'GET',
				url: '/files?path=notes%2Fexample.txt',
			});
			assert.deepEqual(persistedFile.json(), {
				file: { path: 'notes/example.txt', size: 18, content: 'persistent content' },
			});
			assert.deepEqual((await restartedServer.inject({ method: 'GET', url: '/files' })).json(), {
				files: [{ path: 'notes/example.txt', size: 18 }],
			});
		} finally {
			await restartedServer.close();
		}

		const overwritten = await server.inject({
			method: 'PUT',
			url: '/files',
			payload: { path: 'notes/example.txt', content: 'updated' },
		});
		assert.equal(overwritten.statusCode, 200);
		assert.equal(overwritten.json().created, false);

		for (const invalidPath of ['../escape.txt', outsideFile]) {
			const rejected = await server.inject({
				method: 'PUT',
				url: '/files',
				payload: { path: invalidPath, content: 'escape' },
			});
			assert.equal(rejected.statusCode, 400);
		}
		assert.equal(fs.existsSync(outsideFile), false);

		const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-storage-link-'));
		try {
			fs.symlinkSync(outsideDirectory, path.join(directory, 'files', 'link'));
			const rejectedLink = await server.inject({
				method: 'PUT',
				url: '/files',
				payload: { path: 'link/escape.txt', content: 'escape' },
			});
			assert.equal(rejectedLink.statusCode, 400);
			assert.equal(fs.existsSync(path.join(outsideDirectory, 'escape.txt')), false);
		} finally {
			fs.rmSync(outsideDirectory, { recursive: true, force: true });
		}

		assert.deepEqual(
			(await server.inject({ method: 'DELETE', url: '/files?path=notes%2Fexample.txt' })).json(),
			{ deleted: true }
		);
		assert.deepEqual((await server.inject({ method: 'DELETE', url: '/settings' })).json(), {
			deleted: true,
		});
		assert.equal((await server.inject({ method: 'GET', url: '/files?path=missing.txt' })).statusCode, 404);
		assert.deepEqual((await server.inject({ method: 'GET', url: '/settings' })).json(), {
			exists: false,
			settings: {},
		});
	} finally {
		await server.close();
		fs.rmSync(directory, { recursive: true, force: true });
		fs.rmSync(outsideFile, { force: true });
	}
});
