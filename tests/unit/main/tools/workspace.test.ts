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

	it('routes the apply_patch action', async () => {
		await expect(
			workspaceTool.execute(
				{
					action: 'apply_patch',
					diff: ['--- /dev/null', '+++ b/patched.txt', '@@ -0,0 +1 @@', '+patched'].join('\n'),
				},
				ctx
			)
		).resolves.toMatchObject({ status: 'ok' });
		await expect(fs.readFile(path.join(workspace, 'patched.txt'), 'utf8')).resolves.toBe(
			'patched\n'
		);
	});

	it('requires a diff for apply_patch', async () => {
		const result = await workspaceTool.execute({ action: 'apply_patch' }, ctx);
		expect(result.status).toBe('error');
		expect(result.content[0]?.type === 'text' ? result.content[0].text : '').toContain(
			'diff is required'
		);
	});
});
