import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { workspaceTool } from '../../../../src/main/tools';
import type { ToolContext } from '../../../../src/main/tools';

function toolContext(workspace: string): ToolContext {
	return {
		workspace,
		sessionId: 'test-session',
		readState: new Map(),
		plan: { entries: [] },
		services: {} as ToolContext['services'],
	};
}

describe('workspace', () => {
	let tempRoot: string;
	let workspace: string;
	let ctx: ToolContext;

	beforeEach(async () => {
		tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-workspace-tool-'));
		workspace = path.join(tempRoot, 'workspace');
		await fs.mkdir(workspace);
		ctx = toolContext(workspace);
	});

	afterEach(async () => {
		await fs.rm(tempRoot, { recursive: true, force: true });
	});

	it('records read state and preserves write-before-read checks', async () => {
		const file = path.join(workspace, 'note.txt');
		await fs.writeFile(file, 'first', 'utf8');

		const blocked = await workspaceTool.execute(
			{ action: 'write', path: 'note.txt', content: 'second' },
			ctx
		);
		expect(blocked.status).toBe('error');
		expect(blocked.content[0]?.type === 'text' ? blocked.content[0].text : '').toContain(
			'must read'
		);

		await expect(workspaceTool.execute({ action: 'read', path: 'note.txt' }, ctx)).resolves.toMatchObject({
			status: 'ok',
		});
		await expect(
			workspaceTool.execute({ action: 'write', path: 'note.txt', content: 'second' }, ctx)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(file, 'utf8')).resolves.toBe('second');
	});

	it('routes edit through the stale-file guard', async () => {
		const file = path.join(workspace, 'edit.txt');
		await fs.writeFile(file, 'alpha', 'utf8');
		await workspaceTool.execute({ action: 'read', path: 'edit.txt' }, ctx);
		await fs.writeFile(file, 'changed elsewhere', 'utf8');

		const edited = await workspaceTool.execute(
			{ action: 'edit', path: 'edit.txt', old: 'alpha', new: 'beta' },
			ctx
		);

		expect(edited.status).toBe('error');
		expect(edited.content[0]?.type === 'text' ? edited.content[0].text : '').toContain(
			'changed on disk'
		);
	});

	it('routes delete, copy, move, and apply_patch actions', async () => {
		await fs.writeFile(path.join(workspace, 'source.txt'), 'source', 'utf8');

		await expect(
			workspaceTool.execute({
				action: 'copy',
				source: 'source.txt',
				destination: 'copy.txt',
			}, ctx)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(path.join(workspace, 'copy.txt'), 'utf8')).resolves.toBe('source');

		await workspaceTool.execute({ action: 'read', path: 'copy.txt' }, ctx);
		await expect(
			workspaceTool.execute({
				action: 'move',
				source: 'copy.txt',
				destination: 'moved.txt',
			}, ctx)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(path.join(workspace, 'moved.txt'), 'utf8')).resolves.toBe('source');

		await expect(
			workspaceTool.execute({
				action: 'apply_patch',
				diff: ['--- /dev/null', '+++ b/patched.txt', '@@ -0,0 +1 @@', '+patched'].join('\n'),
			}, ctx)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(path.join(workspace, 'patched.txt'), 'utf8')).resolves.toBe(
			'patched\n'
		);

		await expect(
			workspaceTool.execute({ action: 'delete', path: 'moved.txt' }, ctx)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.stat(path.join(workspace, 'moved.txt'))).rejects.toMatchObject({
			code: 'ENOENT',
		});
	});
});
