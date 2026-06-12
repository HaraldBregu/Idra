import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentContext } from '../../../../src/main/agent/loop/context';
import { ExecTool } from '../../../../src/main/agent/tools/exec';
import { ReadTool } from '../../../../src/main/agent/tools/read';
import { WriteTool } from '../../../../src/main/agent/tools/write';
import { resolveToolPath } from '../../../../src/main/agent/tools/resolve';

describe('agent file tools', () => {
	let workspacePath: string;

	beforeEach(async () => {
		workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-agent-tools-'));
	});

	afterEach(async () => {
		await fs.rm(workspacePath, { recursive: true, force: true });
	});

	it('writes relative paths under the workspace path', async () => {
		const result = await new WriteTool(workspacePath).run({
			path: 'notes/test.txt',
			content: 'hello',
		});
		const expectedPath = path.join(workspacePath, 'notes/test.txt');

		await expect(fs.readFile(expectedPath, 'utf8')).resolves.toBe('hello');
		expect(result.path).toBe(expectedPath);
	});

	it('keeps file state in a shared tool context', async () => {
		const context = new AgentContext();
		const write = new WriteTool(workspacePath, context);
		const read = new ReadTool(workspacePath, context);
		const expectedPath = path.join(workspacePath, 'notes/test.txt');

		expect(context.snapshot()).toEqual({});

		await write.run({ path: 'notes/test.txt', content: 'hello' });
		await expect(read.run({ path: 'notes/test.txt' })).resolves.toBe('hello');

		expect(context.snapshot()).toEqual({
			path: expectedPath,
		});
	});

	it('records exec workdir in the shared tool context', async () => {
		const context = new AgentContext();
		const tool = new ExecTool(workspacePath, context);
		const nestedPath = path.join(workspacePath, 'nested');
		const command = `"${process.execPath}" --version`;

		expect(context.snapshot()).toEqual({});

		await fs.mkdir(nestedPath, { recursive: true });
		const first = await tool.run({ command, workdir: 'nested' });
		const second = await tool.run({ command });

		expect(first.workdir).toBe(nestedPath);
		expect(second.workdir).toBe(workspacePath);
		expect(context.path).toBe(workspacePath);
	});

	it('expands home-relative paths', () => {
		expect(resolveToolPath(workspacePath, '~/Desktop/test.txt')).toBe(
			path.resolve(os.homedir(), 'Desktop/test.txt')
		);
	});
});
