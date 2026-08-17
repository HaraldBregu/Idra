import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { McpManager } from '../src/main/agent/core/mcp';
import { readMcp } from '../src/main/mcp/read';
import type { McpServer } from '../src/main/mcp/types';
import { writeMcp } from '../src/main/mcp/write';
import { createApiServer } from '../src/main/server';

const memory: McpServer = {
	id: 'memory',
	package: '@modelcontextprotocol/server-memory',
	args: [],
	enabled: true,
};

test('MCP store persists validated server configuration securely', () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-mcp-store-'));
	try {
		writeMcp(directory, { servers: [memory] });
		assert.deepEqual(readMcp(directory), { servers: [memory] });
		assert.equal(fs.statSync(path.join(directory, 'mcp.json')).mode & 0o777, 0o600);
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

test('MCP manager discovers tools from an enabled stored server', async () => {
	const manager = new McpManager();
	manager.configure([memory]);
	try {
		const tools = await manager.tools();
		assert.ok(tools.length > 0);
		assert.ok(tools.every((tool) => tool.id.startsWith('mcp__memory__')));
		assert.deepEqual(manager.errors, []);
	} finally {
		await manager.close();
	}
});

test('authenticated MCP API saves, reloads, and removes servers', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-mcp-api-'));
	let configured: McpServer[] = [];
	const server = await createApiServer(
		{
			async send() {
				return '';
			},
			cancel() {
				return true;
			},
			configureMcp(servers) {
				configured = servers;
			},
		},
		{ dataDirectory: directory, storageApiToken: 'mcp-token' }
	);
	server.log.level = 'silent';
	const headers = { authorization: 'Bearer mcp-token' };
	try {
		assert.equal((await server.inject({ method: 'GET', url: '/mcp' })).statusCode, 401);
		const saved = await server.inject({
			method: 'PUT',
			url: '/mcp/memory',
			headers,
			payload: { package: memory.package, args: memory.args, enabled: memory.enabled },
		});
		assert.equal(saved.statusCode, 200);
		assert.deepEqual(configured, [memory]);
		assert.deepEqual((await server.inject({ method: 'GET', url: '/mcp', headers })).json(), {
			servers: [memory],
		});
		assert.deepEqual(
			(await server.inject({ method: 'DELETE', url: '/mcp/memory', headers })).json(),
			{ deleted: true }
		);
		assert.deepEqual(configured, []);
	} finally {
		await server.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
