import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectAgentToolsForTurn, workspaceTool } from '../../../../src/main/tools';
import type { AgentTool, ToolContext } from '../../../../src/main/tools';

function toolContext(workspace: string): ToolContext {
	return {
		workspace,
		sessionId: 'test-session',
		readState: new Map(),
		plan: { entries: [] },
		services: {} as ToolContext['services'],
	};
}

describe('workspace delete', () => {
	it('selects workspace for absolute path delete requests', () => {
		const tools = [workspaceTool] as AgentTool[];

		const selection = selectAgentToolsForTurn(
			tools,
			'delete /Users/haraldbregu/Desktop/dummy.txt',
			toolContext(process.cwd()),
			{ maxPromptTools: 2 }
		);

		expect(selection.toolsForPrompt.map((tool) => tool.name)).toEqual(['workspace']);
	});

	it('deletes an absolute path outside the workspace through workspace', async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-file-delete-'));
		const workspace = path.join(tempRoot, 'workspace');
		const outside = path.join(tempRoot, 'outside.txt');
		await fs.mkdir(workspace);
		await fs.writeFile(outside, 'temporary file', 'utf8');
		const ctx = toolContext(workspace);

		try {
			const deleted = await workspaceTool.execute({ action: 'delete', path: outside }, ctx);
			expect(deleted.status).toBe('ok');
			await expect(fs.stat(outside)).rejects.toMatchObject({ code: 'ENOENT' });
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true });
		}
	});
});
