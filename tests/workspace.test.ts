import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { workspaceTools } from '../src/main/agent/workspace/tools';
import type { Tool } from '../src/main/agent/types';

test('root-bound workspace tools read, write, and edit relative files', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-workspace-tools-'));
	const root = path.join(directory, 'workspace');
	fs.mkdirSync(root);
	fs.writeFileSync(path.join(root, 'existing.txt'), 'before');
	const tools = new Map(workspaceTools(root).map((tool) => [tool.id, tool]));

	try {
		assert.deepEqual([...tools.keys()], ['read_file', 'write_file', 'edit_file']);
		assert.equal(await requireTool(tools, 'read_file').run({ path: 'existing.txt' }), 'before');

		await requireTool(tools, 'write_file').run({
			path: 'nested/created.txt',
			content: 'created',
		});
		assert.equal(fs.readFileSync(path.join(root, 'nested', 'created.txt'), 'utf8'), 'created');

		await requireTool(tools, 'edit_file').run({
			path: 'existing.txt',
			oldText: 'before',
			newText: 'after',
		});
		assert.equal(fs.readFileSync(path.join(root, 'existing.txt'), 'utf8'), 'after');
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

test('root-bound workspace tools reject invalid and escaping paths', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-workspace-policy-'));
	const root = path.join(directory, 'workspace');
	const outside = path.join(directory, 'outside');
	const sentinel = path.join(outside, 'sentinel.txt');
	fs.mkdirSync(root);
	fs.mkdirSync(outside);
	fs.writeFileSync(sentinel, 'untouched');
	fs.symlinkSync(sentinel, path.join(root, 'final-link'));
	fs.symlinkSync(outside, path.join(root, 'directory-link'));
	const tools = workspaceTools(root);
	const invalidPaths = [
		sentinel,
		'../outside/sentinel.txt',
		'nested/../outside/sentinel.txt',
		'bad\\path.txt',
		'bad\0path.txt',
		'C:/outside/sentinel.txt',
		'final-link',
		'directory-link/sentinel.txt',
	];

	try {
		for (const tool of tools) {
			for (const invalidPath of invalidPaths) {
				await assert.rejects(async () => tool.run(toolInput(tool.id, invalidPath)));
			}
		}
		assert.equal(fs.readFileSync(sentinel, 'utf8'), 'untouched');
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

function requireTool(tools: Map<string, Tool>, id: string): Tool {
	const selected = tools.get(id);
	assert.ok(selected);
	return selected;
}

function toolInput(toolId: string, filePath: string): Record<string, unknown> {
	if (toolId === 'write_file') return { path: filePath, content: 'changed' };
	if (toolId === 'edit_file') return { path: filePath, oldText: 'untouched', newText: 'changed' };
	return { path: filePath };
}
