import path from 'node:path';
import { promises as fs } from 'node:fs';
import { shell } from 'electron';
import { beforeToolCall, newCallTracker } from '../../../../src/main/tools/before-call';
import { execTool, processTool } from '../../../../src/main/tools/exec';
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
import { openBrowserTool } from '../../../../src/main/tools/app';
import {
	cronAddTool,
	cronListTool,
	cronRemoveTool,
	cronTool,
} from '../../../../src/main/tools/cron';
import { taskTool } from '../../../../src/main/tools/task';
import { startupFilesTool } from '../../../../src/main/tools/startup';
import { AgentStartupFilesService } from '../../../../src/main/agent/startup-files';
import { textResult, type AgentTool } from '../../../../src/main/tools/types';
import { makeTempDir, makeToolContext } from '../test-helpers';

describe('tools/types', () => {
	it('creates text results with ok and error status', () => {
		expect(textResult('ok')).toEqual({ status: 'ok', content: [{ type: 'text', text: 'ok' }] });
		expect(textResult('bad', true).status).toBe('error');
	});
});

describe('tools/policy and registry', () => {
	const all: AgentTool[] = ['read', 'write', 'web_fetch', 'exec'].map((name) => ({
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
			filterTools(all, { profile: 'full', allow: ['w*'], deny: ['web_*'] }).map((t) => t.name)
		).toEqual(['write']);
		expect(
			createTools({ profile: 'standard', allow: [], deny: ['exec'] }).some((t) => t.name === 'exec')
		).toBe(false);
		expect(createTools({ profile: 'standard', allow: [], deny: [] }).map((t) => t.name)).toEqual(
			expect.arrayContaining(['cron'])
		);
		expect(
			createTools({ profile: 'standard', allow: [], deny: [] }).some((t) => t.name === 'task')
		).toBe(true);
	});

	it('keeps the preloaded local registry aligned with the docs index', async () => {
		const index = await fs.readFile(
			path.resolve(process.cwd(), 'docs/tools/list/index.md'),
			'utf8'
		);
		const documentedTools = [...index.matchAll(/\| \[([a-z_]+)\]\([^)]+\.md\) \|/g)].map(
			(match) => match[1]
		);

		expect(PRELOADED_LOCAL_TOOLS.map((tool) => tool.name)).toEqual(documentedTools);
		expect(createTools({ profile: 'full', allow: [], deny: [] }).map((tool) => tool.name)).toEqual(
			documentedTools
		);
		expect(documentedTools).not.toContain('startup_files');
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
			'exec',
			'process',
			'web_fetch',
			'cron',
			'task',
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
		expect(localToolNamesForGroup('browser')).toEqual(['open_browser', 'browser']);
		expect(byName.get('write')).toMatchObject({
			group: 'file',
			approval: { mode: 'workspace-boundary', target: 'write-target' },
		});
		expect(byName.get('exec')).toMatchObject({
			group: 'shell',
			approval: { mode: 'workspace-boundary', target: 'workdir' },
		});
		expect(byName.get('cron')).toMatchObject({
			group: 'automation',
			ownerOnly: true,
			approval: { mode: 'action', actions: ['add', 'update', 'remove', 'run', 'wake'] },
		});
		expect(byName.get('task')?.approval).toEqual({ mode: 'always' });
	});
});

describe('tools/task', () => {
	it('starts a background task through the main task manager', async () => {
		const record = {
			id: 'task-1',
			type: 'agent.run',
			title: 'Summarize workspace',
			status: 'queued' as const,
			createdAt: '2026-05-21T00:00:00.000Z',
			metadata: {},
		};
		const taskManager = {
			startUserTask: jest.fn(() => record),
		};

		const result = await taskTool.execute(
			{
				type: 'agent.run',
				title: ' Summarize workspace ',
				input: { message: 'Summarize the workspace' },
				metadata: { source: 'test' },
			},
			makeToolContext({
				services: {
					...makeToolContext().services,
					taskManager: taskManager as never,
				},
			})
		);

		expect(result.status).toBe('ok');
		expect(result.details).toBe(record);
		expect(taskManager.startUserTask).toHaveBeenCalledWith({
			type: 'agent.run',
			title: 'Summarize workspace',
			input: { message: 'Summarize the workspace' },
			metadata: { source: 'test' },
		});
	});

	it('returns a tool error when the task manager service is unavailable', async () => {
		const result = await taskTool.execute(
			{ type: 'agent.run', title: 'Missing service', input: { message: 'hello' } },
			makeToolContext()
		);

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toContain('TaskManager service is not available');
	});

	it('rejects malformed task tool requests before calling the task manager', async () => {
		const taskManager = {
			startUserTask: jest.fn(),
		};

		const result = await taskTool.execute(
			{ type: 'agent.run', title: 'Bad metadata', metadata: [] as never },
			makeToolContext({
				services: {
					...makeToolContext().services,
					taskManager: taskManager as never,
				},
			})
		);

		expect(result.status).toBe('error');
		expect(result.content[0]?.text).toContain('Task metadata must be an object');
		expect(taskManager.startUserTask).not.toHaveBeenCalled();
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

describe('tools/exec', () => {
	it('runs commands and denies dangerous patterns', async () => {
		const workspace = await makeTempDir();
		const ok = await execTool.execute({ command: 'printf hello' }, makeToolContext({ workspace }));
		expect(ok.status).toBe('ok');
		expect(ok.content[0]?.text).toContain('hello');

		const denied = await execTool.execute({ command: 'rm -rf /' }, makeToolContext({ workspace }));
		expect(denied.status).toBe('error');
		expect(denied.content[0]?.text).toContain('denied');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('allows disabling the foreground command timeout', async () => {
		const workspace = await makeTempDir();
		const result = await execTool.execute(
			{ command: 'node -e "setTimeout(() => console.log(\'done\'), 25)"', timeoutMs: 0 },
			makeToolContext({ workspace })
		);

		expect(result.status).toBe('ok');
		expect(result.content[0]?.text).toContain('done');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('keeps shell workdirs inside the workspace when writeWorkspaceOnly is enabled', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		const ctx = makeToolContext({ workspace, fsPolicy: { writeWorkspaceOnly: true } });

		const inside = await execTool.execute({ command: 'printf ok', workdir: workspace }, ctx);
		expect(inside.status).toBe('ok');
		expect(inside.content[0]?.text).toContain('ok');

		const blocked = await execTool.execute({ command: 'printf no', workdir: outside }, ctx);
		expect(blocked.status).toBe('error');
		expect(blocked.content[0]?.text).toContain('workdir is outside the workspace');

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('runs Python scripts through shell execution', async () => {
		const workspace = await makeTempDir();
		const result = await execTool.execute(
			{ command: 'python3 -c "print(6 * 7)"' },
			makeToolContext({ workspace })
		);

		expect(result.status).toBe('ok');
		expect(result.content[0]?.text).toContain('42');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('terminates foreground commands when the tool context is aborted', async () => {
		const workspace = await makeTempDir();
		const controller = new AbortController();
		const promise = execTool.execute(
			{ command: 'node -e "setTimeout(() => {}, 5000)"' },
			makeToolContext({ workspace, signal: controller.signal })
		);
		setTimeout(() => controller.abort(), 20);

		const result = await promise;

		expect(result.status).toBe('error');
		expect(result.details?.exitCode).toBe(-1);
		expect(result.details?.durationMs).toBeLessThan(1000);
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('starts and inspects background processes', async () => {
		const workspace = await makeTempDir();
		const started = await execTool.execute(
			{ command: 'printf bg', background: true },
			makeToolContext({ workspace })
		);
		expect(started.status).toBe('ok');
		const id = /process (\d+)/.exec(started.content[0]?.text ?? '')?.[1];
		expect(id).toBeDefined();
		await new Promise((resolve) => setTimeout(resolve, 25));
		const log = await processTool.execute({ action: 'log', id }, makeToolContext({ workspace }));
		expect(log.content[0]?.text).toContain('bg');
		await fs.rm(workspace, { recursive: true, force: true });
	});
});

describe('tools/app, cron, and startup', () => {
	it('opens browser URLs through Electron and rejects non-http URLs', async () => {
		const ctx = makeToolContext();
		expect((await openBrowserTool.execute({ url: 'https://example.com' }, ctx)).status).toBe('ok');
		expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
		expect((await openBrowserTool.execute({ url: 'file:///tmp/secret' }, ctx)).status).toBe(
			'error'
		);
	});

	it('manages cron tools through CronService', async () => {
		const jobs = new Map<string, { id: string; expression: string }>();
		const cron = {
			schedule: jest.fn((id: string, expression: string) => jobs.set(id, { id, expression })),
			listJobs: jest.fn(() => [...jobs.values()]),
			has: jest.fn((id: string) => jobs.has(id)),
			unschedule: jest.fn((id: string) => jobs.delete(id)),
		};
		const ctx = makeToolContext({
			services: { ...makeToolContext().services, cron: cron as never },
		});
		expect(
			(
				await cronAddTool.execute(
					{ id: 'job1', expression: '* * * * *', data: { type: 'agent' } },
					ctx
				)
			).status
		).toBe('ok');
		expect((await cronListTool.execute({}, ctx)).content[0]?.text).toContain('job1');
		expect((await cronRemoveTool.execute({ job_id: 'job1' }, ctx)).status).toBe('ok');
	});

	it('routes structured cron tool actions through CronService', async () => {
		const cron = {
			fridayAction: jest.fn(async () => ({
				status: 'ok',
				enabled: true,
				result: { enabled: true, timerArmed: false, jobCount: 0, runningCount: 0 },
			})),
		};
		const ctx = makeToolContext({
			services: { ...makeToolContext().services, cron: cron as never },
		});

		const result = await cronTool.execute({ action: 'status' }, ctx);

		expect(result.status).toBe('ok');
		expect(cron.fridayAction).toHaveBeenCalledWith(
			{ action: 'status' },
			{
				role: 'owner',
				sessionId: 'test-session',
			}
		);
		expect(result.content[0]?.text).toContain('"timerArmed": false');
	});

	it('manages allowlisted agent startup files through the startup tool', async () => {
		const root = await makeTempDir();
		const services = {
			...makeToolContext().services,
			startupFiles: new AgentStartupFilesService({
				rootPath: path.join(root, 'agent', 'workspaces'),
			}),
		};
		const ctx = makeToolContext({ agentId: 'main', services });

		const listed = await startupFilesTool.execute({ action: 'list' }, ctx);
		expect(listed.status).toBe('ok');
		expect(listed.content[0]?.text).toContain('IDENTITY.md');

		const wrote = await startupFilesTool.execute(
			{
				action: 'write',
				name: 'IDENTITY.md',
				content: 'identity',
			},
			ctx
		);
		expect(wrote.status).toBe('ok');

		const read = await startupFilesTool.execute({ action: 'read', name: 'IDENTITY.md' }, ctx);
		expect(read.content[0]?.text).toContain('identity');

		const completed = await startupFilesTool.execute({ action: 'complete_bootstrap' }, ctx);
		expect(completed.status).toBe('ok');
		await expect(
			fs.access(path.join(root, 'agent', 'workspaces', 'main', 'BOOTSTRAP.md'))
		).rejects.toThrow();
		await fs.rm(root, { recursive: true, force: true });
	});
});
