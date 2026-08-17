import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { McpManager, mcpConfig } from '../src/main/agent/core/mcp';
import { createApiServer } from '../src/main/server';
import { mcpResult } from '../src/main/agent/core/mcp/result';

test('Playwright MCP uses the pinned local server', () => {
	const [server] = mcpConfig(process.cwd(), true);
	assert.ok(server);
	assert.equal(server.command, process.execPath);
	assert.match(server.args[0] ?? '', /node_modules[/\\]@playwright[/\\]mcp[/\\]cli\.js$/);
	assert.equal(fs.existsSync(server.args[0] ?? ''), true);
});

test('MCP manager has no tools when no servers are configured', async () => {
	const manager = new McpManager([]);
	assert.deepEqual(await manager.tools(), []);
	assert.deepEqual(manager.errors, []);
	await manager.close();
});

test('MCP results preserve structured content and surface tool errors', () => {
	assert.deepEqual(mcpResult({ structuredContent: { value: 1 }, content: [] }), { value: 1 });
	assert.throws(
		() => mcpResult({ isError: true, content: [{ type: 'text', text: 'browser failed' }] }),
		/browser failed/
	);
});

test('Playwright MCP can be enabled through the authenticated API', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-mcp-'));
	let enabled: boolean | undefined;
	const server = await createApiServer(
		{
			async send() {
				return '';
			},
			cancel() {
				return true;
			},
			async configurePlaywrightMcp(value) {
				enabled = value;
			},
		},
		{ dataDirectory: directory, storageApiToken: 'mcp-test-token' }
	);
	server.log.level = 'silent';
	const headers = { authorization: 'Bearer mcp-test-token' };
	try {
		assert.equal((await server.inject({ method: 'GET', url: '/mcp/playwright' })).statusCode, 401);
		const response = await server.inject({
			method: 'PUT',
			url: '/mcp/playwright',
			headers,
			payload: { enabled: true },
		});
		assert.deepEqual(response.json(), { enabled: true });
		assert.equal(enabled, true);
		assert.deepEqual(
			(await server.inject({ method: 'GET', url: '/mcp/playwright', headers })).json(),
			{ enabled: true }
		);
		assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'settings.json'), 'utf8')), {
			mcp: { playwright: true },
		});
	} finally {
		await server.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
