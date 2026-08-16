import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApiServer } from '../src/main/server';
import { generateAccessKey } from '../src/ui/key.js';

const agent = {
	async send(): Promise<string> {
		return 'unused';
	},
	cancel(): boolean {
		return true;
	},
};

test('first-run access setup protects the UI and persists login across restarts', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-access-'));
	const server = await createApiServer(agent, {
		accessControl: true,
		dataDirectory: directory,
		storageApiToken: null,
	});
	server.log.level = 'silent';
	const accessKey = generateAccessKey({
		getRandomValues(bytes: Uint8Array): Uint8Array {
			for (let index = 0; index < bytes.length; index += 1) bytes[index] = index;
			return bytes;
		},
	} as Crypto);

	try {
		assert.match(accessKey, /^idra_[A-Za-z0-9_-]{43}$/);
		const root = await server.inject({ method: 'GET', url: '/' });
		assert.equal(root.statusCode, 302);
		assert.equal(root.headers.location, '/access');

		const accessPage = await server.inject({ method: 'GET', url: '/access' });
		assert.equal(accessPage.statusCode, 200);
		assert.match(accessPage.body, /id="access-input"/);
		assert.match(accessPage.body, /id="generate-access"/);
		assert.match(accessPage.body, /id="access-save"/);
		assert.doesNotMatch(accessPage.body, /Provider and model|Storage document/);
		assert.deepEqual((await server.inject({ method: 'GET', url: '/access/status' })).json(), {
			configured: false,
			authenticated: false,
		});
		assert.equal((await server.inject({ method: 'GET', url: '/health' })).statusCode, 200);
		assert.equal((await server.inject({ method: 'GET', url: '/storage' })).statusCode, 401);

		const invalid = await server.inject({
			method: 'POST',
			url: '/access/session',
			payload: { accessKey: 'short' },
		});
		assert.equal(invalid.statusCode, 400);

		const saved = await server.inject({
			method: 'POST',
			url: '/access/session',
			payload: { accessKey },
		});
		assert.equal(saved.statusCode, 204);
		const setCookie = saved.headers['set-cookie'];
		assert.ok(setCookie);
		assert.match(setCookie, /^idra_session=/);
		assert.match(setCookie, /HttpOnly/);
		assert.match(setCookie, /SameSite=Strict/);
		assert.match(setCookie, /Max-Age=31536000/);
		assert.doesNotMatch(setCookie, new RegExp(accessKey));
		const cookie = setCookie.split(';', 1)[0];

		const accessFile = path.join(directory, 'access.json');
		assert.equal(fs.statSync(accessFile).mode & 0o777, 0o600);
		assert.equal(fs.readFileSync(accessFile, 'utf8').includes(accessKey), false);

		const authenticatedRoot = await server.inject({
			method: 'GET',
			url: '/',
			headers: { cookie },
		});
		assert.equal(authenticatedRoot.statusCode, 200);
		assert.match(authenticatedRoot.body, /Agent console/);
		assert.doesNotMatch(authenticatedRoot.body, /admin-token|Connect to the admin API/);
		assert.equal(
			(await server.inject({ method: 'GET', url: '/access', headers: { cookie } })).statusCode,
			302
		);
		assert.equal(
			(await server.inject({ method: 'GET', url: '/storage', headers: { cookie } })).statusCode,
			200
		);
		assert.deepEqual(
			(await server.inject({ method: 'GET', url: '/access/status', headers: { cookie } })).json(),
			{ configured: true, authenticated: true }
		);

		const originalAccessFile = fs.readFileSync(accessFile, 'utf8');
		const wrongKey = `idra_${'A'.repeat(43)}`;
		assert.equal(
			(
				await server.inject({
					method: 'POST',
					url: '/access/session',
					payload: { accessKey: wrongKey },
				})
			).statusCode,
			401
		);
		assert.equal(fs.readFileSync(accessFile, 'utf8'), originalAccessFile);

		const tamperedCookie = `${cookie.slice(0, -1)}x`;
		assert.equal(
			(await server.inject({ method: 'GET', url: '/', headers: { cookie: tamperedCookie } }))
				.statusCode,
			302
		);

		const restartedServer = await createApiServer(agent, {
			accessControl: true,
			dataDirectory: directory,
			storageApiToken: null,
		});
		restartedServer.log.level = 'silent';
		try {
			assert.equal(
				(await restartedServer.inject({ method: 'GET', url: '/', headers: { cookie } })).statusCode,
				200
			);
			const relogin = await restartedServer.inject({
				method: 'POST',
				url: '/access/session',
				payload: { accessKey },
			});
			assert.equal(relogin.statusCode, 204);
			assert.match(relogin.headers['set-cookie'] ?? '', /^idra_session=/);
		} finally {
			await restartedServer.close();
		}
	} finally {
		await server.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
