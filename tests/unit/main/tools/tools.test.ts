import path from 'node:path';
import { promises as fs } from 'node:fs';
import { beforeToolCall, newCallTracker } from '../../../../src/main/agent/tools/before-call';
import {
	applyPatchTool,
	copyTool,
	deleteTool,
	editTool,
	findTool,
	filesystemCopyTool,
	filesystemCreateTool,
	filesystemDeleteTool,
	filesystemListTool,
	filesystemMoveTool,
	filesystemReadTool,
	filesystemSearchTool,
	filesystemUpdateTool,
	inspectFileTool,
	moveTool,
	readTool,
	writeTool,
} from '../../../../src/main/agent/tools/fs';
import {
	cronCreateTool,
	cronDeleteTool,
	cronListTool,
	cronReadTool,
	cronRunTool,
	cronStartTool,
	cronStopTool,
	cronUpdateTool,
} from '../../../../src/main/agent/tools/cron/tools';
import { scriptRunTool } from '../../../../src/main/agent/tools/scripts/tools';
import { runShellTool } from '../../../../src/main/agent/tools/workspace/tools';
import {
	createTools,
	LOCAL_TOOL_CATALOG,
	localToolCatalogByName,
	localToolNamesForGroup,
	localToolNamesForProfile,
	PRELOADED_LOCAL_TOOLS,
} from '../../../../src/main/agent/tools/registry';
import {
	AGENT_TOOL_APPROVAL_ALWAYS,
	AGENT_TOOL_APPROVAL_NONE,
	AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
	AGENT_ALL_TOOL_NAMES,
	AGENT_DEFAULT_TOOL_GROUPS,
	AGENT_DEFAULT_TOOLS,
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	AGENT_TOOLS,
} from '../../../../src/shared/tools';
import { textResult, type AgentTool } from '../../../../src/main/agent/tools/types';
import { evaluateToolAccess } from '../../../../src/main/agent/tools/access';
import { makeTempDir, makeToolContext } from '../test-helpers';

type ToolFilterPolicy = {
	profile: 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';
	allow: string[];
	alsoAllow?: string[];
	deny: string[];
};

function filterTools(all: AgentTool[], cfg: ToolFilterPolicy): AgentTool[] {
	const result = evaluateToolAccess(
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
	const all: AgentTool[] = ['read_file', 'write_file', 'search_files', 'exec'].map((name) => ({
		name,
		description: name,
		schema: {},
		execute: jest.fn(),
	}));

	it('filters by profile, allow globs, and deny globs', () => {
		expect(
			filterTools(all, { profile: 'minimal', allow: [], deny: [] }).map((t) => t.name)
		).toEqual(['read_file', 'write_file', 'search_files', 'exec']);
		expect(
			filterTools(all, { profile: 'minimal', allow: [], alsoAllow: ['read_file'], deny: [] }).map(
				(t) => t.name
			)
		).toEqual(['read_file', 'write_file', 'search_files', 'exec']);
		expect(
			filterTools(all, { profile: 'full', allow: ['w*'], deny: ['write_file_backup'] }).map((t) => t.name)
		).toEqual(['write_file']);
		expect(
			createTools({ profile: 'standard', allow: [], deny: ['exec'] }).some((t) => t.name === 'exec')
		).toBe(false);
		expect(createTools({ profile: 'standard', allow: [], deny: [] }).map((t) => t.name)).toEqual(
			[...AGENT_ALL_TOOL_NAMES]
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
		const standardToolNames = [...AGENT_TOOL_NAMES];
		const byName = localToolCatalogByName();

		expect(new Set(catalogNames).size).toBe(catalogNames.length);
		expect(LOCAL_TOOL_CATALOG.map((entry) => entry.tool.name)).toEqual(catalogNames);
		expect(PRELOADED_LOCAL_TOOLS).toEqual(LOCAL_TOOL_CATALOG.map((entry) => entry.tool));
		expect(localToolNamesForProfile('minimal')).toEqual([]);
		expect(localToolNamesForProfile('messaging')).toEqual([]);
		expect(localToolNamesForProfile('coding')).toEqual(standardToolNames);
		expect(localToolNamesForProfile('standard')).toEqual(standardToolNames);
		expect(localToolNamesForProfile('full')).toEqual(catalogNames);
		expect(localToolNamesForGroup('coreWorkspace')).toEqual(
			AGENT_TOOLS.filter((tool) => tool.group === 'coreWorkspace').map((tool) => tool.name)
		);
		expect(localToolNamesForGroup('mcpConnector')).toEqual(
			AGENT_DEFAULT_TOOL_GROUPS.mcpConnector.map((tool) => tool.name)
		);
		expect(byName.get('write_file')).toMatchObject({
			group: 'coreWorkspace',
			approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
			profiles: AGENT_TOOL_METADATA_BY_NAME.write_file.profiles,
		});
		expect(byName.get('run_shell')).toMatchObject({
			group: 'coreWorkspace',
			approval: AGENT_TOOL_APPROVAL_NONE,
			profiles: AGENT_TOOL_METADATA_BY_NAME.run_shell.profiles,
		});
		expect(byName.has('exec')).toBe(false);
		expect(byName.has('cron')).toBe(false);
		expect(byName.has('bootstrap')).toBe(false);
		expect(byName.has('startup_files')).toBe(false);
	});

	it('exports shared metadata with descriptions, permissions, and approval policy', () => {
		expect(AGENT_DEFAULT_TOOLS.map((tool) => tool.name)).toEqual([...AGENT_TOOL_NAMES]);
		expect(AGENT_TOOLS.map((tool) => tool.name)).toEqual([...AGENT_ALL_TOOL_NAMES]);
		expect(AGENT_TOOL_METADATA_BY_NAME.read_file).toMatchObject({
			group: 'coreWorkspace',
			description: 'Read a UTF-8 workspace file with optional line offset and limit.',
			permissions: ['read'],
			profiles: ['coding', 'standard', 'full'],
			availability: 'default',
		});
		expect(AGENT_TOOL_METADATA_BY_NAME.write_file).toMatchObject({
			permissions: ['create', 'write'],
			approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		});
		expect(AGENT_TOOL_METADATA_BY_NAME.call_mcp_tool).toMatchObject({
			permissions: ['mcp:call'],
			approval: AGENT_TOOL_APPROVAL_ALWAYS,
		});
		expect(AGENT_TOOL_METADATA_BY_NAME.script_run).toMatchObject({
			group: 'script',
			permissions: ['read', 'write', 'execute'],
			availability: 'optional',
		});
		expect(AGENT_TOOL_METADATA_BY_NAME.cron_create).toMatchObject({
			group: 'cron',
			permissions: ['cron:createSchedule'],
			availability: 'optional',
		});
		expect(AGENT_TOOL_METADATA_BY_NAME.apply_patch).toMatchObject({
			permissions: ['create', 'write', 'delete'],
			availability: 'legacy',
		});
	});

	it('covers every native tool implementation with shared UI metadata', () => {
		const implementedToolNames = [
			...LOCAL_TOOL_CATALOG.map((entry) => entry.tool.name),
			readTool.name,
			writeTool.name,
			editTool.name,
			applyPatchTool.name,
			deleteTool.name,
			copyTool.name,
			moveTool.name,
			inspectFileTool.name,
			findTool.name,
			filesystemCreateTool.name,
			filesystemListTool.name,
			filesystemReadTool.name,
			filesystemUpdateTool.name,
			filesystemDeleteTool.name,
			filesystemMoveTool.name,
			filesystemCopyTool.name,
			filesystemSearchTool.name,
			scriptRunTool.name,
			cronCreateTool.name,
			cronReadTool.name,
			cronUpdateTool.name,
			cronDeleteTool.name,
			cronListTool.name,
			cronStartTool.name,
			cronStopTool.name,
			cronRunTool.name,
		];
		const uniqueImplementedNames = [...new Set(implementedToolNames)].sort();

		expect(uniqueImplementedNames).toEqual([...AGENT_ALL_TOOL_NAMES].sort());
		for (const name of uniqueImplementedNames) {
			expect(AGENT_TOOL_METADATA_BY_NAME[name]).toEqual(
				expect.objectContaining({
					name,
					description: expect.any(String),
					permissions: expect.any(Array),
					approval: expect.any(Object),
				})
			);
			expect(AGENT_TOOL_METADATA_BY_NAME[name].permissions.length).toBeGreaterThan(0);
		}
	});
});

describe('tools/before-call', () => {
	it('allows static approval-marked tools and still tracks repeated calls', async () => {
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
		expect(unconfirmed.proceed).toBe(true);

		expect((await beforeToolCall(tool, { path: 'a' }, ctx, tracker)).proceed).toBe(true);
		const third = await beforeToolCall(tool, { path: 'a' }, ctx, tracker);
		expect(third.warning).toContain('3th identical call');
		expect(ctx.approvalCache.has('write::{"path":"a"}')).toBe(false);
	});

	it('does not require approval for run_shell by default', async () => {
		const result = await beforeToolCall(
			runShellTool,
			{ command: 'echo ok' },
			makeToolContext(),
			newCallTracker()
		);

		expect(result.proceed).toBe(true);
	});

	it('allows run_shell outside the .friday root', async () => {
		const home = await makeTempDir();
		const fridayRoot = path.join(home, '.friday');
		const workspace = path.join(fridayRoot, 'workspace');
		const outside = await makeTempDir();
		await fs.mkdir(workspace, { recursive: true });
		const ctx = makeToolContext({ workspace });
		(ctx.services.userDataDirectory.getRootPath as jest.Mock).mockReturnValue(fridayRoot);

		await expect(
			beforeToolCall(runShellTool, { command: 'pwd' }, ctx, newCallTracker())
		).resolves.toMatchObject({ proceed: true });
		await expect(
			beforeToolCall(runShellTool, { command: 'pwd', cwd: outside }, ctx, newCallTracker())
		).resolves.toMatchObject({ proceed: true });

		await fs.rm(home, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
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

	it('does not enforce workspace-only boundaries but still honors read-only mode', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		await fs.writeFile(path.join(workspace, 'inside.txt'), 'inside', 'utf8');
		await fs.writeFile(path.join(outside, 'outside.txt'), 'outside', 'utf8');
		const ctx = makeToolContext({ workspace, fsPolicy: { workspaceOnly: true } });

		expect((await readTool.execute({ path: 'inside.txt' }, ctx)).status).toBe('ok');
		expect((await readTool.execute({ path: path.join(outside, 'outside.txt') }, ctx)).status).toBe(
			'ok'
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

	it('allows outside paths without approval or stored file policy', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		const outsideFile = path.join(outside, 'allowed.txt');
		const ctx = makeToolContext({ workspace });

		const writeArgs = { path: outsideFile, content: 'created' };
		await expect(
			beforeToolCall(
				writeTool,
				writeArgs,
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(writeTool.execute(writeArgs, ctx)).resolves.toMatchObject({
			status: 'ok',
		});
		await expect(fs.readFile(outsideFile, 'utf8')).resolves.toBe('created');

		const editArgs = { path: outsideFile, old: 'created', new: 'updated' };
		await expect(
			beforeToolCall(
				editTool,
				editArgs,
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(editTool.execute(editArgs, ctx)).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(outsideFile, 'utf8')).resolves.toBe('updated');

		const outsideCopy = path.join(outside, 'copy.txt');
		const copyArgs = { source: outsideFile, destination: outsideCopy };
		await expect(
			beforeToolCall(
				copyTool,
				copyArgs,
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(copyTool.execute(copyArgs, ctx)).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(outsideCopy, 'utf8')).resolves.toBe('updated');

		const outsideMoved = path.join(outside, 'moved.txt');
		const moveArgs = { source: outsideCopy, destination: outsideMoved };
		await expect(
			beforeToolCall(
				moveTool,
				moveArgs,
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(moveTool.execute(moveArgs, ctx)).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(outsideMoved, 'utf8')).resolves.toBe('updated');

		const patchArgs = {
			diff: [
				`--- ${outsideMoved}`,
				`+++ ${outsideMoved}`,
				'@@ -1 +1 @@',
				'-updated',
				'+patched',
			].join('\n'),
		};
		await expect(
			beforeToolCall(
				applyPatchTool,
				patchArgs,
				ctx,
				newCallTracker()
			)
		).resolves.toMatchObject({ proceed: true });
		await expect(applyPatchTool.execute(patchArgs, ctx)).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(outsideMoved, 'utf8')).resolves.toBe('patched');

		const deleteArgs = { path: outsideMoved };
		await expect(
			beforeToolCall(deleteTool, deleteArgs, ctx, newCallTracker())
		).resolves.toMatchObject({ proceed: true });
		await expect(deleteTool.execute(deleteArgs, ctx)).resolves.toMatchObject({
			status: 'ok',
		});
		await expect(fs.stat(outsideMoved)).rejects.toThrow();

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('allows mutating file targets under .friday even when they are outside the workspace', async () => {
		const home = await makeTempDir();
		const fridayRoot = path.join(home, '.friday');
		const workspace = path.join(fridayRoot, 'workspace');
		const notesFile = path.join(fridayRoot, 'notes', 'a.txt');
		await fs.mkdir(workspace, { recursive: true });
		const ctx = makeToolContext({ workspace });
		(ctx.services.userDataDirectory.getRootPath as jest.Mock).mockReturnValue(fridayRoot);

		await expect(
			beforeToolCall(writeTool, { path: notesFile, content: 'ok' }, ctx, newCallTracker())
		).resolves.toMatchObject({ proceed: true });
		await expect(writeTool.execute({ path: notesFile, content: 'ok' }, ctx)).resolves.toMatchObject({
			status: 'ok',
		});
		await expect(fs.readFile(notesFile, 'utf8')).resolves.toBe('ok');

		await fs.rm(home, { recursive: true, force: true });
	});

	it('does not confine mutating file targets when writeWorkspaceOnly is enabled', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		const ctx = makeToolContext({ workspace, fsPolicy: { writeWorkspaceOnly: true } });
		const outsideFile = path.join(outside, 'outside.txt');
		await fs.writeFile(path.join(workspace, 'inside.txt'), 'inside', 'utf8');
		await fs.writeFile(outsideFile, 'outside', 'utf8');

		expect((await readTool.execute({ path: outsideFile }, ctx)).status).toBe('ok');
		expect(
			(await writeTool.execute({ path: path.join(outside, 'new.txt'), content: 'x' }, ctx)).status
		).toBe('ok');
		await expect(fs.readFile(path.join(outside, 'new.txt'), 'utf8')).resolves.toBe('x');

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
		).toBe('ok');
		await expect(fs.readFile(path.join(outside, 'copy.txt'), 'utf8')).resolves.toBe('inside');

		expect(
			(await editTool.execute({ path: outsideFile, old: 'outside', new: 'changed' }, ctx)).status
		).toBe('ok');
		await expect(fs.readFile(outsideFile, 'utf8')).resolves.toBe('changed');

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('does not confine mutating file targets by default', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		const ctx = makeToolContext({ workspace });
		const outsideFile = path.join(outside, 'outside.txt');
		await fs.writeFile(outsideFile, 'outside', 'utf8');

		expect((await readTool.execute({ path: outsideFile }, ctx)).status).toBe('ok');
		expect(
			(await writeTool.execute({ path: path.join(outside, 'new.txt'), content: 'x' }, ctx)).status
		).toBe('ok');
		await expect(fs.readFile(path.join(outside, 'new.txt'), 'utf8')).resolves.toBe('x');

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
		).toBe('ok');
		await expect(fs.readFile(path.join(outside, 'copy.txt'), 'utf8')).resolves.toBe('outside');

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

	it('copies nested files without stored file policy checks', async () => {
		const workspace = await makeTempDir();
		const sourceDir = path.join(workspace, 'source-dir');
		const privateDir = path.join(sourceDir, 'private');
		await fs.mkdir(privateDir, { recursive: true });
		await fs.writeFile(path.join(sourceDir, 'public.txt'), 'public', 'utf8');
		await fs.writeFile(path.join(privateDir, 'secret.txt'), 'secret', 'utf8');
		const ctx = makeToolContext({ workspace });

		const result = await copyTool.execute({ source: 'source-dir', destination: 'copied-dir' }, ctx);

		expect(result.status).toBe('ok');
		await expect(
			fs.readFile(path.join(workspace, 'copied-dir', 'private', 'secret.txt'), 'utf8')
		).resolves.toBe('secret');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('runs script files without workspace-boundary path checks', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		await fs.writeFile(
			path.join(workspace, 'hello.js'),
			"console.log('hello ' + process.argv[2]);\n",
			'utf8'
		);
		await fs.writeFile(path.join(outside, 'outside.js'), "console.log('outside');\n", 'utf8');
		const ctx = makeToolContext({ workspace });

		const result = await scriptRunTool.execute(
			{ path: 'hello.js', args: ['Friday'] },
			ctx
		);

		expect(result.status).toBe('ok');
		expect(result.content[0]?.text).toContain('hello Friday');
		expect(
			(
				await scriptRunTool.execute(
					{ path: path.join(outside, 'outside.js') },
					makeToolContext({ workspace })
				)
			).status
		).toBe('ok');
		await expect(
			scriptRunTool.execute(
				{ path: 'hello.js' },
				makeToolContext({ workspace, fsPolicy: { readOnly: true } })
			)
		).resolves.toMatchObject({ status: 'error' });

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

});
