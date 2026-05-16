import path from 'node:path';
import { promises as fs } from 'node:fs';
import { nativeTheme, shell, app } from 'electron';
import { beforeToolCall, newCallTracker } from '../../../../src/main/tools/before-call';
import { execTool, processTool } from '../../../../src/main/tools/exec';
import { readTool, writeTool, editTool, findTool, applyPatchTool } from '../../../../src/main/tools/fs';
import { updatePlanTool } from '../../../../src/main/tools/plan';
import { filterTools } from '../../../../src/main/tools/policy';
import { createTools } from '../../../../src/main/tools/registry';
import { askHumanTool } from '../../../../src/main/tools/ask-human';
import {
	setThemeModeTool,
	openAppDataFolderTool,
	openUserDataFolderTool,
	openFolderTool,
	setMenuBarTool,
} from '../../../../src/main/tools/app';
import { cronAddTool, cronListTool, cronRemoveTool, cronTool } from '../../../../src/main/tools/cron';
import { getProviderByIdTool, setProviderApiKeyTool } from '../../../../src/main/tools/providers';
import { getAgentModelTool, getAgentServiceTool, setAgentServiceTool } from '../../../../src/main/tools/services';
import { getWorkspaceContentTool, getWorkspacePathTool } from '../../../../src/main/tools/workspace';
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
		expect(filterTools(all, { profile: 'minimal', allow: [], deny: [] }).map((t) => t.name)).toEqual([]);
		expect(filterTools(all, { profile: 'minimal', allow: [], alsoAllow: ['read'], deny: [] }).map((t) => t.name)).toEqual(['read']);
		expect(filterTools(all, { profile: 'full', allow: ['w*'], deny: ['web_*'] }).map((t) => t.name)).toEqual(['write']);
		expect(createTools({ profile: 'standard', allow: [], deny: ['exec'] }).some((t) => t.name === 'exec')).toBe(false);
	});
});

describe('tools/before-call', () => {
	it('reuses allow-always approvals and warns on repeated identical calls', async () => {
		const tool: AgentTool = { name: 'write', description: '', schema: {}, needsApproval: true, execute: jest.fn() };
		const ask = jest.fn(async () => 'allow-always' as const);
		const ctx = makeToolContext({ approveStream: { ask } });
		const tracker = newCallTracker();

		expect((await beforeToolCall(tool, { path: 'a' }, ctx, tracker)).proceed).toBe(true);
		expect((await beforeToolCall(tool, { path: 'a' }, ctx, tracker)).proceed).toBe(true);
		const third = await beforeToolCall(tool, { path: 'a' }, ctx, tracker);
		expect(third.warning).toContain('3th identical call');
		expect(ask).toHaveBeenCalledTimes(1);
	});

	it('does not reuse allow-once approvals', async () => {
		const tool: AgentTool = { name: 'write', description: '', schema: {}, needsApproval: true, execute: jest.fn() };
		const ask = jest.fn(async () => 'allow-once' as const);
		const ctx = makeToolContext({ approveStream: { ask } });
		const tracker = newCallTracker();

		expect((await beforeToolCall(tool, { path: 'a' }, ctx, tracker)).proceed).toBe(true);
		expect((await beforeToolCall(tool, { path: 'a' }, ctx, tracker)).proceed).toBe(true);
		expect(ask).toHaveBeenCalledTimes(2);
	});

	it('blocks denied and unavailable approvals before execution', async () => {
		const tool: AgentTool = { name: 'exec', description: '', schema: {}, needsApproval: true, execute: jest.fn() };
		const tracker = newCallTracker();
		const denied = await beforeToolCall(
			tool,
			{ command: 'printf no' },
			makeToolContext({ approveStream: { ask: jest.fn(async () => 'deny' as const) } }),
			tracker
		);
		expect(denied.proceed).toBe(false);
		expect(denied.vetoResult?.content[0]?.text).toContain('denied');

		const unavailable = await beforeToolCall(
			tool,
			{ command: 'printf maybe' },
			makeToolContext({ approveStream: { ask: jest.fn(async () => null) } }),
			tracker
		);
		expect(unavailable.proceed).toBe(false);
		expect(unavailable.vetoResult?.content[0]?.text).toContain('timed out or is unavailable');
		expect(tool.execute).not.toHaveBeenCalled();
	});
});

describe('tools/fs', () => {
	it('reads, writes new files, edits read files, and finds matches', async () => {
		const workspace = await makeTempDir();
		const ctx = makeToolContext({ workspace });
		await fs.writeFile(path.join(workspace, 'a.txt'), 'one\ntwo\none\n', 'utf8');

		const read = await readTool.execute({ path: 'a.txt', limit: 2 }, ctx);
		expect(read.content[0]?.text).toContain('1\tone');

		const blocked = await writeTool.execute({ path: 'a.txt', content: 'x' }, makeToolContext({ workspace }));
		expect(blocked.status).toBe('error');

		const edit = await editTool.execute({ path: 'a.txt', old: 'one', new: 'ONE', replaceAll: true }, ctx);
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
		expect((await readTool.execute({ path: path.join(outside, 'outside.txt') }, ctx)).status).toBe('error');
		await expect(writeTool.execute(
			{ path: 'new.txt', content: 'x' },
			makeToolContext({ workspace, fsPolicy: { readOnly: true } })
		)).resolves.toMatchObject({ status: 'error' });

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('applies unified diffs only after reading the target file', async () => {
		const workspace = await makeTempDir();
		const file = path.join(workspace, 'patch.txt');
		await fs.writeFile(file, 'one\ntwo\nthree\n', 'utf8');
		const ctx = makeToolContext({ workspace });
		await readTool.execute({ path: 'patch.txt' }, ctx);

		const result = await applyPatchTool.execute({
			diff: [
				'--- a/patch.txt',
				'+++ b/patch.txt',
				'@@ -1,3 +1,3 @@',
				' one',
				'-two',
				'+TWO',
				' three',
			].join('\n'),
		}, ctx);

		expect(result.status).toBe('ok');
		await expect(fs.readFile(file, 'utf8')).resolves.toBe('one\nTWO\nthree\n');
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

	it('starts and inspects background processes', async () => {
		const workspace = await makeTempDir();
		const started = await execTool.execute({ command: 'printf bg', background: true }, makeToolContext({ workspace }));
		expect(started.status).toBe('ok');
		const id = /process (\d+)/.exec(started.content[0]?.text ?? '')?.[1];
		expect(id).toBeDefined();
		await new Promise((resolve) => setTimeout(resolve, 25));
		const log = await processTool.execute({ action: 'log', id }, makeToolContext({ workspace }));
		expect(log.content[0]?.text).toContain('bg');
		await fs.rm(workspace, { recursive: true, force: true });
	});
});

describe('tools/plan', () => {
	it('updates plan state in the tool context', async () => {
		const ctx = makeToolContext();
		const result = await updatePlanTool.execute({ plan: [{ task: 'ship', status: 'in_progress' }] }, ctx);
		expect(result.status).toBe('ok');
		expect(ctx.plan.entries).toEqual([{ task: 'ship', status: 'in_progress' }]);
	});
});

describe('tools/app, ask-human, cron, providers, services, workspace', () => {
	it('runs app tools through Electron and EventBus seams', async () => {
		const ctx = makeToolContext();
		expect((await setThemeModeTool.execute({ mode: 'dark' }, ctx)).status).toBe('ok');
		expect(nativeTheme.themeSource).toBe('dark');
		expect(ctx.services.eventBus.emit).toHaveBeenCalledWith('theme:changed', { theme: 'dark' });

		(app.getPath as jest.Mock).mockReturnValueOnce('/tmp/userData');
		await openAppDataFolderTool.execute({}, ctx);
		expect(shell.openPath).toHaveBeenCalledWith('/tmp/userData');

		await openUserDataFolderTool.execute({}, ctx);
		expect(ctx.services.userDataDirectory.ensureRoot).toHaveBeenCalled();
		expect(shell.openPath).toHaveBeenCalledWith(ctx.workspace);

		const workspace = await makeTempDir();
		const folderCtx = makeToolContext({ workspace });
		await fs.mkdir(path.join(workspace, 'nested'));
		const opened = await openFolderTool.execute({ path: 'nested' }, folderCtx);
		expect(opened.status).toBe('ok');
		await expect(fs.realpath(path.join(workspace, 'nested'))).resolves.toBe(
			(shell.openPath as jest.Mock).mock.calls.at(-1)?.[0]
		);
		await expect(fs.rm(workspace, { recursive: true, force: true })).resolves.toBeUndefined();

		await setMenuBarTool.execute({ enabled: true }, ctx);
		expect(ctx.services.eventBus.emit).toHaveBeenCalledWith('tray:set-enabled', { enabled: true });
	});

	it('confines open_folder to existing workspace folders and surfaces open errors', async () => {
		const workspace = await makeTempDir();
		const ctx = makeToolContext({ workspace });
		await fs.writeFile(path.join(workspace, 'file.txt'), 'x');

		await expect(openFolderTool.execute({ path: 'missing' }, ctx)).resolves.toMatchObject({ status: 'error' });
		await expect(openFolderTool.execute({ path: 'file.txt' }, ctx)).resolves.toMatchObject({ status: 'error' });
		await expect(openFolderTool.execute({ path: '..' }, ctx)).resolves.toMatchObject({ status: 'error' });

		(shell.openPath as jest.Mock).mockResolvedValueOnce('permission denied');
		const blocked = await openFolderTool.execute({}, ctx);
		expect(blocked).toMatchObject({ status: 'error' });
		expect(blocked.content[0]?.text).toBe('permission denied');
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('asks humans through elicitation stream', async () => {
		const ctx = makeToolContext({ elicit: { ask: jest.fn(async () => 'answer') } });
		const result = await askHumanTool.execute({ question: 'Where?', suggestions: ['a'] }, ctx);
		expect(result.content[0]?.text).toBe('answer');
	});

	it('manages cron tools through CronService', async () => {
		const jobs = new Map<string, { id: string; expression: string }>();
		const cron = {
			schedule: jest.fn((id: string, expression: string) => jobs.set(id, { id, expression })),
			listJobs: jest.fn(() => [...jobs.values()]),
			has: jest.fn((id: string) => jobs.has(id)),
			unschedule: jest.fn((id: string) => jobs.delete(id)),
		};
		const ctx = makeToolContext({ services: { ...makeToolContext().services, cron: cron as never } });
		expect((await cronAddTool.execute({ id: 'job1', expression: '* * * * *', data: { type: 'agent' } }, ctx)).status).toBe('ok');
		expect((await cronListTool.execute({}, ctx)).content[0]?.text).toContain('job1');
		expect((await cronRemoveTool.execute({ job_id: 'job1' }, ctx)).status).toBe('ok');
	});

	it('routes structured cron tool actions through CronService', async () => {
		const cron = {
			openClawAction: jest.fn(async () => ({
				status: 'ok',
				enabled: true,
				result: { enabled: true, timerArmed: false, jobCount: 0, runningCount: 0 },
			})),
		};
		const ctx = makeToolContext({ services: { ...makeToolContext().services, cron: cron as never } });

		const result = await cronTool.execute({ action: 'status' }, ctx);

		expect(result.status).toBe('ok');
		expect(cron.openClawAction).toHaveBeenCalledWith({ action: 'status' }, {
			role: 'owner',
			sessionId: 'test-session',
		});
		expect(result.content[0]?.text).toContain('"timerArmed": false');
	});

	it('reads and updates provider and agent settings through StoreService', async () => {
		const provider = { id: 'openai', name: 'OpenAI', apiKey: 'sk', baseUrl: 'https://api.openai.com/v1' };
		const store = {
			getProviderById: jest.fn(() => provider),
			setOpenAiApiKey: jest.fn(),
			setAnthropicApiKey: jest.fn(),
			getAgentService: jest.fn(() => ({ provider, model: { id: 'gpt', name: 'GPT' } })),
			getAgentModel: jest.fn(() => ({ id: 'gpt', name: 'GPT' })),
			setAgentService: jest.fn(() => true),
		};
		const ctx = makeToolContext({ services: { ...makeToolContext().services, store: store as never } });
		expect((await getProviderByIdTool.execute({ id: 'openai' }, ctx)).content[0]?.text).toContain('OpenAI');
		expect((await setProviderApiKeyTool.execute({ id: 'openai', apiKey: 'new' }, ctx)).status).toBe('ok');
		expect(store.setOpenAiApiKey).toHaveBeenCalledWith('new');
		expect((await getAgentServiceTool.execute({}, ctx)).content[0]?.text).toContain('GPT');
		expect((await getAgentModelTool.execute({}, ctx)).content[0]?.text).toContain('gpt');
		expect((await setAgentServiceTool.execute({ providerId: 'openai', modelId: 'gpt', modelName: 'GPT' }, ctx)).status).toBe('ok');
	});

	it('lists workspace content and returns workspace path', async () => {
		const workspace = await makeTempDir();
		await fs.mkdir(path.join(workspace, 'dir'));
		await fs.writeFile(path.join(workspace, 'dir', 'file.txt'), 'x');
		const ctx = makeToolContext({ workspace });
		const listed = await getWorkspaceContentTool.execute({ maxDepth: 2 }, ctx);
		expect(listed.content[0]?.text).toContain('file.txt');
		expect((await getWorkspacePathTool.execute({}, ctx)).content[0]?.text).toBe(workspace);
		await fs.rm(workspace, { recursive: true, force: true });
	});
});
