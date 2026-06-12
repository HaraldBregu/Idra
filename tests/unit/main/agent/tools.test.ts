import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FindTool } from '../../../../src/main/agent/tools/find';
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

	it('finds files by wildcard pattern', async () => {
		await fs.mkdir(path.join(workspacePath, 'src/main'), { recursive: true });
		await fs.writeFile(path.join(workspacePath, 'src/main/index.ts'), '');
		await fs.writeFile(path.join(workspacePath, 'src/main/readme.md'), '');

		const result = await new FindTool(workspacePath).run({
			pattern: '*.ts',
			path: 'src',
		});

		expect(result.matches).toEqual([path.join(workspacePath, 'src/main/index.ts')]);
		expect(result.count).toBe(1);
		expect(result.truncated).toBe(false);
	});
});
