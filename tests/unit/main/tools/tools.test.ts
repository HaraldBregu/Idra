import path from 'node:path';
import { promises as fs } from 'node:fs';
import { beforeToolCall, newCallTracker } from '../../../../src/main/tools/before-call';
import {
	applyPatchTool,
	copyTool,
	deleteTool,
	editTool,
	findTool,
	inspectFileTool,
	moveTool,
	readTool,
	writeTool,
} from '../../../../src/main/tools/fs';
import { filterTools } from '../../../../src/main/tools/policy';
import {
	createTools,
	LOCAL_TOOL_CATALOG,
	localToolCatalogByName,
	localToolNamesForGroup,
	localToolNamesForProfile,
	PRELOADED_LOCAL_TOOLS,
} from '../../../../src/main/tools/registry';
import { textResult, type AgentTool } from '../../../../src/main/tools/types';
import { makeTempDir, makeToolContext } from '../test-helpers';

describe('tools/types', () => {
	it('creates text results with ok and error status', () => {
		expect(textResult('ok')).toEqual({ status: 'ok', content: [{ type: 'text', text: 'ok' }] });
		expect(textResult('bad', true).status).toBe('error');
	});
});

describe('tools/policy and registry', () => {
	const all: AgentTool[] = ['read', 'write', 'find', 'exec'].map((name) => ({
		name,
		description: name,
		schema: {},
		execute: jest.fn(),
	}));

	it('filters by profile, allow globs, and deny globs', () => {
		expect(
			filterTools(all, { profile: 'minimal', allow: [], deny: [] }).map((t) => t.name)
		).toEqual([]);
		expect(
			filterTools(all, { profile: 'minimal', allow: [], alsoAllow: ['read'], deny: [] }).map(
				(t) => t.name
			)
		).toEqual(['read']);
		expect(
			filterTools(all, { profile: 'full', allow: ['w*'], deny: ['write_backup'] }).map((t) => t.name)
		).toEqual(['write']);
		expect(
			createTools({ profile: 'standard', allow: [], deny: ['exec'] }).some((t) => t.name === 'exec')
		).toBe(false);
		expect(createTools({ profile: 'standard', allow: [], deny: [] }).map((t) => t.name)).toEqual(
			LOCAL_TOOL_CATALOG.map((entry) => entry.name)
		);
	});

	it('keeps the preloaded local registry aligned with the catalog', () => {
		const catalogTools = LOCAL_TOOL_CATALOG.map((entry) => entry.name);

		expect(PRELOADED_LOCAL_TOOLS.map((tool) => tool.name)).toEqual(catalogTools);
		expect(createTools({ profile: 'full', allow: [], deny: [] }).map((tool) => tool.name)).toEqual(
			catalogTools
		);
		expect(catalogTools).not.toContain('bootstrap');
		expect(catalogTools).not.toContain('startup_files');
	});

	it('defines local tool control metadata in one catalog', () => {
		const catalogNames = LOCAL_TOOL_CATALOG.map((entry) => entry.name);
		const standardToolNames = [
			'read',
			'write',
			'edit',
			'apply_patch',
			'delete',
			'copy',
			'move',
			'inspect_file',
			'find',
		];
		const byName = localToolCatalogByName();

		expect(new Set(catalogNames).size).toBe(catalogNames.length);
		expect(LOCAL_TOOL_CATALOG.map((entry) => entry.tool.name)).toEqual(catalogNames);
		expect(PRELOADED_LOCAL_TOOLS).toEqual(LOCAL_TOOL_CATALOG.map((entry) => entry.tool));
		expect(localToolNamesForProfile('minimal')).toEqual([]);
		expect(localToolNamesForProfile('messaging')).toEqual([]);
		expect(localToolNamesForProfile('coding')).toEqual(standardToolNames);
		expect(localToolNamesForProfile('standard')).toEqual(standardToolNames);
		expect(localToolNamesForProfile('full')).toEqual(catalogNames);
		expect(localToolNamesForGroup('file')).toEqual(standardToolNames);
		expect(byName.get('write')).toMatchObject({
			group: 'file',
			approval: { mode: 'workspace-boundary', target: 'write-target' },
		});
		expect(byName.has('exec')).toBe(false);
		expect(byName.has('cron')).toBe(false);
		expect(byName.has('bootstrap')).toBe(false);
		expect(byName.has('startup_files')).toBe(false);
	});
});

describe('tools/before-call', () => {
	it('rejects unconfirmed approval-marked tools and allows confirmed repeats', async () => {
		const tool: AgentTool = {
			name: 'write',
			description: '',
			schema: {},
			needsApproval: true,
			execute: jest.fn(),
		};
		const ctx = makeToolContext();
		const tracker = newCallTracker();

		const unconfirmed = await beforeToolCall(tool, { path: 'a' }, ctx, tracker);
		expect(unconfirmed.proceed).toBe(false);
		expect(unconfirmed.vetoStatus).toBe('rejected');

		ctx.approvalCache.add('write::{"path":"a"}');
		expect((await beforeToolCall(tool, { path: 'a' }, ctx, tracker)).proceed).toBe(true);
		const third = await beforeToolCall(tool, { path: 'a' }, ctx, tracker);
		expect(third.warning).toContain('3th identical call');
		expect(ctx.approvalCache.has('write::{"path":"a"}')).toBe(true);
	});

});

describe('tools/fs', () => {
	it('reads, writes new files, edits read files, and finds matches', async () => {
		const workspace = await makeTempDir();
		const ctx = makeToolContext({ workspace });
		await fs.writeFile(path.join(workspace, 'a.txt'), 'one\ntwo\none\n', 'utf8');

		const read = await readTool.execute({ path: 'a.txt', limit: 2 }, ctx);
		expect(read.content[0]?.text).toContain('1\tone');

		const blocked = await writeTool.execute(
			{ path: 'a.txt', content: 'x' },
			makeToolContext({ workspace })
		);
		expect(blocked.status).toBe('error');

		const edit = await editTool.execute(
			{ path: 'a.txt', old: 'one', new: 'ONE', replaceAll: true },
			ctx
		);
		expect(edit.status).toBe('ok');
		await expect(fs.readFile(path.join(workspace, 'a.txt'), 'utf8')).resolves.toContain('ONE');

		const write = await writeTool.execute({ path: 'nested/b.txt', content: 'new' }, ctx);
		expect(write.status).toBe('ok');
		const found = await findTool.execute({ pattern: '**/*.txt' }, ctx);
		expect(found.content[0]?.text).toContain('nested/b.txt');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('enforces workspace-only and read-only filesystem policy', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		await fs.writeFile(path.join(workspace, 'inside.txt'), 'inside', 'utf8');
		await fs.writeFile(path.join(outside, 'outside.txt'), 'outside', 'utf8');
		const ctx = makeToolContext({ workspace, fsPolicy: { workspaceOnly: true } });

		expect((await readTool.execute({ path: 'inside.txt' }, ctx)).status).toBe('ok');
		expect((await readTool.execute({ path: path.join(outside, 'outside.txt') }, ctx)).status).toBe(
			'error'
		);
		await expect(
			writeTool.execute(
				{ path: 'new.txt', content: 'x' },
				makeToolContext({ workspace, fsPolicy: { readOnly: true } })
			)
		).resolves.toMatchObject({ status: 'error' });

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('confines mutating file targets to the workspace when writeWorkspaceOnly is enabled', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		const ctx = makeToolContext({ workspace, fsPolicy: { writeWorkspaceOnly: true } });
		const outsideFile = path.join(outside, 'outside.txt');
		await fs.writeFile(path.join(workspace, 'inside.txt'), 'inside', 'utf8');
		await fs.writeFile(outsideFile, 'outside', 'utf8');

		expect((await readTool.execute({ path: outsideFile }, ctx)).status).toBe('ok');
		expect(
			(await writeTool.execute({ path: path.join(outside, 'new.txt'), content: 'x' }, ctx)).status
		).toBe('error');
		await expect(fs.stat(path.join(outside, 'new.txt'))).rejects.toThrow();

		expect(
			(await copyTool.execute({ source: outsideFile, destination: 'copied.txt' }, ctx)).status
		).toBe('ok');
		await expect(fs.readFile(path.join(workspace, 'copied.txt'), 'utf8')).resolves.toBe('outside');

		expect(
			(
				await copyTool.execute(
					{ source: 'inside.txt', destination: path.join(outside, 'copy.txt') },
					ctx
				)
			).status
		).toBe('error');

		expect(
			(await editTool.execute({ path: outsideFile, old: 'outside', new: 'changed' }, ctx)).status
		).toBe('error');
		expect((await deleteTool.execute({ path: outsideFile }, ctx)).status).toBe('error');
		expect(
			(await moveTool.execute({ source: outsideFile, destination: 'moved.txt' }, ctx)).status
		).toBe('error');

		const patch = [
			`--- ${outsideFile}`,
			`+++ ${outsideFile}`,
			'@@ -1 +1 @@',
			'-outside',
			'+changed',
		].join('\n');
		expect((await applyPatchTool.execute({ diff: patch }, ctx)).status).toBe('error');
		await expect(fs.readFile(outsideFile, 'utf8')).resolves.toBe('outside');

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('confines mutating file targets to the workspace by default', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		const ctx = makeToolContext({ workspace });
		const outsideFile = path.join(outside, 'outside.txt');
		await fs.writeFile(outsideFile, 'outside', 'utf8');

		expect((await readTool.execute({ path: outsideFile }, ctx)).status).toBe('ok');
		expect(
			(await writeTool.execute({ path: path.join(outside, 'new.txt'), content: 'x' }, ctx)).status
		).toBe('error');
		await expect(fs.stat(path.join(outside, 'new.txt'))).rejects.toThrow();

		expect(
			(await copyTool.execute({ source: outsideFile, destination: 'copied.txt' }, ctx)).status
		).toBe('ok');
		expect(
			(
				await copyTool.execute(
					{
						source: outsideFile,
						destination: path.join(outside, 'copy.txt'),
					},
					ctx
				)
			).status
		).toBe('error');

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('applies unified diffs only after reading the target file', async () => {
		const workspace = await makeTempDir();
		const file = path.join(workspace, 'patch.txt');
		await fs.writeFile(file, 'one\ntwo\nthree\n', 'utf8');
		const ctx = makeToolContext({ workspace });
		await readTool.execute({ path: 'patch.txt' }, ctx);

		const result = await applyPatchTool.execute(
			{
				diff: [
					'--- a/patch.txt',
					'+++ b/patch.txt',
					'@@ -1,3 +1,3 @@',
					' one',
					'-two',
					'+TWO',
					' three',
				].join('\n'),
			},
			ctx
		);

		expect(result.status).toBe('ok');
		await expect(fs.readFile(file, 'utf8')).resolves.toBe('one\nTWO\nthree\n');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('deletes, copies, moves files, and inspects image bytes directly', async () => {
		const workspace = await makeTempDir();
		const ctx = makeToolContext({ workspace });
		await fs.writeFile(path.join(workspace, 'source.txt'), 'alpha', 'utf8');
		await fs.writeFile(path.join(workspace, 'delete-me.txt'), 'remove', 'utf8');
		const png = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
			'base64'
		);
		await fs.writeFile(path.join(workspace, 'pixel.png'), png);

		expect(
			(await copyTool.execute({ source: 'source.txt', destination: 'copy.txt' }, ctx)).status
		).toBe('ok');
		await expect(fs.readFile(path.join(workspace, 'copy.txt'), 'utf8')).resolves.toBe('alpha');

		await readTool.execute({ path: 'copy.txt' }, ctx);
		expect(
			(await moveTool.execute({ source: 'copy.txt', destination: 'moved.txt' }, ctx)).status
		).toBe('ok');
		await expect(fs.readFile(path.join(workspace, 'moved.txt'), 'utf8')).resolves.toBe('alpha');
		await expect(fs.stat(path.join(workspace, 'copy.txt'))).rejects.toThrow();

		expect(
			(await deleteTool.execute({ path: 'delete-me.txt' }, makeToolContext({ workspace }))).status
		).toBe('error');
		await readTool.execute({ path: 'delete-me.txt' }, ctx);
		expect((await deleteTool.execute({ path: 'delete-me.txt' }, ctx)).status).toBe('ok');
		await expect(fs.stat(path.join(workspace, 'delete-me.txt'))).rejects.toThrow();

		const inspected = await inspectFileTool.execute({ path: 'pixel.png' }, ctx);
		expect(inspected.status).toBe('ok');
		expect(inspected.content).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'image',
					mimeType: 'image/png',
					base64: expect.any(String),
				}),
			])
		);
		expect(inspected.content[0]?.text).toContain('dimensions: 1x1');
		await fs.rm(workspace, { recursive: true, force: true });
	});
});
