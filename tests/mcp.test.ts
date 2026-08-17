import assert from 'node:assert/strict';
import test from 'node:test';
import { McpManager } from '../src/main/agent/core/mcp';
import { mcpResult } from '../src/main/agent/core/mcp/result';

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
