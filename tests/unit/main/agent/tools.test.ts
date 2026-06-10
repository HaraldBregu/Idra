import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

	it('expands home-relative paths', () => {
		expect(resolveToolPath(workspacePath, '~/Desktop/test.txt')).toBe(
			path.resolve(os.homedir(), 'Desktop/test.txt')
		);
	});
});
