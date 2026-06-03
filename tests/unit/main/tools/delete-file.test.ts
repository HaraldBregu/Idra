import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import { deleteFileTool } from '../../../../src/main/tools/delete-file';
import type { ToolContext } from '../../../../src/main/tools/base/tool';

async function makeTempDir(): Promise<string> {
	return fs.mkdtemp(path.join(os.tmpdir(), 'friday-delete-test-'));
}

function makeCtx(workspace: string, overrides: Partial<ToolContext> = {}): ToolContext {
	return {
		workspace,
		sessionId: 'test-session',
		readState: new Map(),
		plan: { entries: [] },
		approvalRequired: new Set(),
		approvalCache: new Set(),
		services: {} as ToolContext['services'],
		...overrides,
	};
}

describe('delete_file tool', () => {
	let workspace: string;
	beforeEach(async () => {
		workspace = await makeTempDir();
	});
	afterEach(async () => {
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('refuses to delete a file that was not read first', async () => {
		const file = path.join(workspace, 'unread.txt');
		await fs.writeFile(file, 'data', 'utf8');

		const result = await deleteFileTool.execute({ path: 'unread.txt' }, makeCtx(workspace));

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toMatch(/must read .* before deleting/);
		await expect(fs.stat(file)).resolves.toBeDefined();
	});

	it('deletes a file once a read snapshot is recorded', async () => {
		const file = path.join(workspace, 'remove-me.txt');
		await fs.writeFile(file, 'gone soon', 'utf8');
		const ctx = makeCtx(workspace);
		const stat = await fs.stat(file);
		ctx.readState.set(file, { mtimeMs: stat.mtimeMs, size: stat.size });

		const result = await deleteFileTool.execute({ path: 'remove-me.txt' }, ctx);

		expect(result.status).toBe('ok');
		expect(result.content[0]?.text).toContain('deleted');
		await expect(fs.stat(file)).rejects.toThrow();
		expect(ctx.readState.has(file)).toBe(false);
	});

	it('detects mtime/size drift since the last read', async () => {
		const file = path.join(workspace, 'drift.txt');
		await fs.writeFile(file, 'first', 'utf8');
		const ctx = makeCtx(workspace);
		const stat = await fs.stat(file);
		ctx.readState.set(file, { mtimeMs: stat.mtimeMs - 1000, size: stat.size + 5 });

		const result = await deleteFileTool.execute({ path: 'drift.txt' }, ctx);

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toMatch(/changed on disk since last read/);
		await expect(fs.stat(file)).resolves.toBeDefined();
	});

	it('rejects directories without recursive=true', async () => {
		const dir = path.join(workspace, 'nested');
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(path.join(dir, 'inner.txt'), 'inside', 'utf8');

		const result = await deleteFileTool.execute({ path: 'nested' }, makeCtx(workspace));

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toMatch(/recursive=true is required/);
		await expect(fs.stat(dir)).resolves.toBeDefined();
	});

	it('deletes a directory tree when recursive=true', async () => {
		const dir = path.join(workspace, 'tree');
		await fs.mkdir(path.join(dir, 'sub'), { recursive: true });
		await fs.writeFile(path.join(dir, 'sub', 'item.txt'), 'data', 'utf8');

		const result = await deleteFileTool.execute(
			{ path: 'tree', recursive: true },
			makeCtx(workspace)
		);

		expect(result.status).toBe('ok');
		expect(result.content[0]?.text).toMatch(/deleted directory/);
		await expect(fs.stat(dir)).rejects.toThrow();
	});

	it('refuses to operate on the workspace root', async () => {
		const result = await deleteFileTool.execute(
			{ path: '.', recursive: true },
			makeCtx(workspace)
		);

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toMatch(/workspace root/);
	});

	it('honors the read-only filesystem policy', async () => {
		const file = path.join(workspace, 'protected.txt');
		await fs.writeFile(file, 'safe', 'utf8');

		const result = await deleteFileTool.execute(
			{ path: 'protected.txt' },
			makeCtx(workspace, { fsPolicy: { readOnly: true } })
		);

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toMatch(/read-only filesystem policy/);
		await expect(fs.stat(file)).resolves.toBeDefined();
	});

	it('surfaces a clear error when the target file does not exist', async () => {
		const result = await deleteFileTool.execute(
			{ path: 'does-not-exist.txt' },
			makeCtx(workspace)
		);

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toMatch(/ENOENT|no such file/i);
	});
});
