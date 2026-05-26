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
import {
	createTools,
	LOCAL_TOOL_CATALOG,
	localToolCatalogByName,
	localToolNamesForGroup,
	localToolNamesForProfile,
	PRELOADED_LOCAL_TOOLS,
} from '../../../../src/main/tools/registry';
import { textResult, type AgentTool } from '../../../../src/main/tools/types';
import { PolicyService } from '../../../../src/main/policy';
import { makeTempDir, makeToolContext } from '../test-helpers';
import type { PolicyConfig } from '../../../../src/shared/policy';

type ToolFilterPolicy = {
	profile: 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';
	allow: string[];
	alsoAllow?: string[];
	deny: string[];
};

function filterTools(all: AgentTool[], cfg: ToolFilterPolicy): AgentTool[] {
	const service = new PolicyService();
	const result = service.evaluateTools(
		all.map((tool) => ({ name: tool.name })),
		{
			stages: {
				profile: { profile: cfg.profile, alsoAllow: cfg.alsoAllow },
				runtime: {
					allow: cfg.allow.length > 0 ? cfg.allow : undefined,
					deny: cfg.deny,
				},
			},
		}
	);
	return all.filter((tool) => result.allowed.has(tool.name.trim().toLowerCase()));
}

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

	it('delegates execution gating to the policy service when available', async () => {
		const tool: AgentTool = {
			name: 'read',
			description: '',
			schema: {},
			execute: jest.fn(),
		};
		const ctx = makeToolContext();
		ctx.services.policy = {
			createToolUseKey: jest.fn(() => 'read::{"path":"a"}'),
			evaluate: jest.fn(),
			evaluateTools: jest.fn(),
			evaluateToolUse: jest.fn(() => ({
				outcome: 'deny',
				key: 'read::{"path":"a"}',
				callCount: 1,
				status: 'error',
				deniedReason: 'loop_detected',
				reason: 'blocked by policy service',
			})),
		};

		const result = await beforeToolCall(tool, { path: 'a' }, ctx, newCallTracker());

		expect(result.proceed).toBe(false);
		expect(result.vetoResult?.content[0]?.text).toBe('blocked by policy service');
		expect(ctx.services.policy.evaluateToolUse).toHaveBeenCalledWith(
			expect.objectContaining({
				toolName: 'read',
				params: { path: 'a' },
				callCount: 1,
			})
		);
	});

});

describe('tools/fs', () => {
	function useFilePolicy(ctx: ReturnType<typeof makeToolContext>, policy: PolicyConfig): void {
		ctx.services.policy = new PolicyService({
			storeAccessor: {
				read: jest.fn(() => policy),
				write: jest.fn(),
			},
		});
	}

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

	it('enforces stored file policy before filesystem operations', async () => {
		const workspace = await makeTempDir();
		const privateDir = path.join(workspace, 'private');
		await fs.mkdir(privateDir);
		await fs.writeFile(path.join(workspace, 'allowed.txt'), 'allowed', 'utf8');
		await fs.writeFile(path.join(privateDir, 'secret.txt'), 'secret', 'utf8');
		const ctx = makeToolContext({ workspace });
		useFilePolicy(ctx, {
			version: 1,
			defaultPolicy: 'deny',
			paths: [
				{ path: workspace, permissions: ['read', 'write'], recursive: true },
				{ path: privateDir, permissions: [], recursive: true },
			],
		});

		expect((await readTool.execute({ path: 'allowed.txt' }, ctx)).status).toBe('ok');
		expect((await readTool.execute({ path: 'private/secret.txt' }, ctx)).status).toBe('error');
		expect((await writeTool.execute({ path: 'allowed.txt', content: 'updated' }, ctx)).status).toBe(
			'ok'
		);
		expect((await writeTool.execute({ path: 'new.txt', content: 'new' }, ctx)).content[0]?.text).toContain(
			"'create'"
		);
		expect((await deleteTool.execute({ path: 'allowed.txt' }, ctx)).content[0]?.text).toContain(
			"'delete'"
		);

		const found = await findTool.execute({ pattern: '**/*.txt' }, ctx);
		expect(found.content[0]?.text).toContain('allowed.txt');
		expect(found.content[0]?.text).not.toContain('private/secret.txt');

		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('allows policy-granted outside paths through approval and file execution', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		const outsideFile = path.join(outside, 'allowed.txt');
		const ctx = makeToolContext({ workspace });
		useFilePolicy(ctx, {
			version: 1,
			defaultPolicy: 'deny',
			paths: [
				{
					path: outside,
					permissions: ['read', 'write', 'create', 'delete'],
					recursive: true,
				},
			],
		});

		await expect(
			beforeToolCall(
				writeTool,
				{ path: outsideFile, content: 'created' },
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(writeTool.execute({ path: outsideFile, content: 'created' }, ctx)).resolves.toMatchObject({
			status: 'ok',
		});
		await expect(fs.readFile(outsideFile, 'utf8')).resolves.toBe('created');

		await expect(
			beforeToolCall(
				editTool,
				{ path: outsideFile, old: 'created', new: 'updated' },
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(
			editTool.execute({ path: outsideFile, old: 'created', new: 'updated' }, ctx)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(outsideFile, 'utf8')).resolves.toBe('updated');

		const outsideCopy = path.join(outside, 'copy.txt');
		await expect(
			beforeToolCall(
				copyTool,
				{ source: outsideFile, destination: outsideCopy },
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(
			copyTool.execute({ source: outsideFile, destination: outsideCopy }, ctx)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(outsideCopy, 'utf8')).resolves.toBe('updated');

		const outsideMoved = path.join(outside, 'moved.txt');
		await expect(
			beforeToolCall(
				moveTool,
				{ source: outsideCopy, destination: outsideMoved },
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(
			moveTool.execute({ source: outsideCopy, destination: outsideMoved }, ctx)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(outsideMoved, 'utf8')).resolves.toBe('updated');

		await expect(
			beforeToolCall(
				applyPatchTool,
				{
					diff: [
						`--- ${outsideMoved}`,
						`+++ ${outsideMoved}`,
						'@@ -1 +1 @@',
						'-updated',
						'+patched',
					].join('\n'),
				},
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(
			applyPatchTool.execute(
				{
					diff: [
						`--- ${outsideMoved}`,
						`+++ ${outsideMoved}`,
						'@@ -1 +1 @@',
						'-updated',
						'+patched',
					].join('\n'),
				},
				ctx
			)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(outsideMoved, 'utf8')).resolves.toBe('patched');

		await expect(
			beforeToolCall(deleteTool, { path: outsideMoved }, ctx, newCallTracker())
		).resolves.toMatchObject({ proceed: true });
		await expect(deleteTool.execute({ path: outsideMoved }, ctx)).resolves.toMatchObject({
			status: 'ok',
		});
		await expect(fs.stat(outsideMoved)).rejects.toThrow();

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

	it('applies create, modify, and delete entries in unified diffs', async () => {
		const workspace = await makeTempDir();
		const ctx = makeToolContext({ workspace });
		useFilePolicy(ctx, {
			version: 1,
			defaultPolicy: 'deny',
			paths: [
				{
					path: workspace,
					permissions: ['read', 'write', 'create', 'delete'],
					recursive: true,
				},
			],
		});
		await fs.writeFile(path.join(workspace, 'update.txt'), 'old\n', 'utf8');
		await fs.writeFile(path.join(workspace, 'remove.txt'), 'remove me\n', 'utf8');
		await readTool.execute({ path: 'update.txt' }, ctx);
		await readTool.execute({ path: 'remove.txt' }, ctx);

		const result = await applyPatchTool.execute(
			{
				diff: [
					'--- /dev/null',
					'+++ b/new.txt',
					'@@ -0,0 +1,2 @@',
					'+created',
					'+file',
					'--- a/update.txt',
					'+++ b/update.txt',
					'@@ -1 +1 @@',
					'-old',
					'+new',
					'--- a/remove.txt',
					'+++ /dev/null',
					'@@ -1 +0,0 @@',
					'-remove me',
				].join('\n'),
			},
			ctx
		);

		expect(result.status).toBe('ok');
		await expect(fs.readFile(path.join(workspace, 'new.txt'), 'utf8')).resolves.toBe(
			'created\nfile\n'
		);
		await expect(fs.readFile(path.join(workspace, 'update.txt'), 'utf8')).resolves.toBe('new\n');
		await expect(fs.stat(path.join(workspace, 'remove.txt'))).rejects.toThrow();
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('rejects a multi-file patch before writing when any path is denied by policy', async () => {
		const workspace = await makeTempDir();
		const privateDir = path.join(workspace, 'private');
		await fs.mkdir(privateDir);
		await fs.writeFile(path.join(workspace, 'allowed.txt'), 'allowed\n', 'utf8');
		await fs.writeFile(path.join(privateDir, 'secret.txt'), 'secret\n', 'utf8');
		const ctx = makeToolContext({ workspace });
		useFilePolicy(ctx, {
			version: 1,
			defaultPolicy: 'deny',
			paths: [
				{
					path: workspace,
					permissions: ['read', 'write', 'create', 'delete'],
					recursive: true,
				},
				{ path: privateDir, permissions: [], recursive: true },
			],
		});
		await readTool.execute({ path: 'allowed.txt' }, ctx);

		const result = await applyPatchTool.execute(
			{
				diff: [
					'--- a/allowed.txt',
					'+++ b/allowed.txt',
					'@@ -1 +1 @@',
					'-allowed',
					'+changed',
					'--- a/private/secret.txt',
					'+++ b/private/secret.txt',
					'@@ -1 +1 @@',
					'-secret',
					'+leaked',
				].join('\n'),
			},
			ctx
		);

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toContain('denied by file policy');
		await expect(fs.readFile(path.join(workspace, 'allowed.txt'), 'utf8')).resolves.toBe(
			'allowed\n'
		);
		await expect(fs.readFile(path.join(privateDir, 'secret.txt'), 'utf8')).resolves.toBe(
			'secret\n'
		);
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('deletes, copies, moves files, and inspects image bytes directly', async () => {
		const workspace = await makeTempDir();
		const ctx = makeToolContext({ workspace });
		await fs.writeFile(path.join(workspace, 'source.txt'), 'alpha', 'utf8');
		await fs.mkdir(path.join(workspace, 'source-dir', 'nested'), { recursive: true });
		await fs.writeFile(path.join(workspace, 'source-dir', 'nested', 'item.txt'), 'nested', 'utf8');
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

		expect(
			(await copyTool.execute({ source: 'source-dir', destination: 'copied-dir' }, ctx)).status
		).toBe('ok');
		await expect(
			fs.readFile(path.join(workspace, 'copied-dir', 'nested', 'item.txt'), 'utf8')
		).resolves.toBe('nested');

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

	it('checks policy for nested files before copying a directory', async () => {
		const workspace = await makeTempDir();
		const sourceDir = path.join(workspace, 'source-dir');
		const privateDir = path.join(sourceDir, 'private');
		await fs.mkdir(privateDir, { recursive: true });
		await fs.writeFile(path.join(sourceDir, 'public.txt'), 'public', 'utf8');
		await fs.writeFile(path.join(privateDir, 'secret.txt'), 'secret', 'utf8');
		const ctx = makeToolContext({ workspace });
		useFilePolicy(ctx, {
			version: 1,
			defaultPolicy: 'deny',
			paths: [
				{
					path: workspace,
					permissions: ['read', 'write', 'create', 'delete'],
					recursive: true,
				},
				{ path: privateDir, permissions: [], recursive: true },
			],
		});

		const result = await copyTool.execute({ source: 'source-dir', destination: 'copied-dir' }, ctx);

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toContain('denied by file policy');
		await expect(fs.stat(path.join(workspace, 'copied-dir'))).rejects.toThrow();
		await fs.rm(workspace, { recursive: true, force: true });
	});
});
