import path from 'node:path';
import { promises as fs } from 'node:fs';
import { AgentStartupFilesService } from '../../../../src/main/agent/startup-files';
import { bootstrapTool, startupFilesTool } from '../../../../src/main/tools/startup';
import { makeTempDir, makeToolContext } from '../test-helpers';

describe('tools/startup bootstrap', () => {
	it('writes required startup files and completes bootstrap without caller paths', async () => {
		const root = await makeTempDir();
		const services = {
			...makeToolContext().services,
			startupFiles: new AgentStartupFilesService({
				rootPath: path.join(root, 'agent', 'workspaces'),
			}),
		};
		const ctx = makeToolContext({ agentId: 'main', services });

		const result = await bootstrapTool.execute(
			{
				identity: '# IDENTITY.md\n\nFriday',
				user: '# USER.md\n\nHarald',
				soul: '# SOUL.md\n\nDirect',
			},
			ctx
		);

		expect(result.status).toBe('ok');
		expect(result.details?.bootstrapCompleted).toBe(true);
		const agentRoot = path.join(root, 'agent', 'workspaces', 'main');
		await expect(fs.readFile(path.join(agentRoot, 'IDENTITY.md'), 'utf8')).resolves.toContain(
			'Friday'
		);
		await expect(fs.readFile(path.join(agentRoot, 'USER.md'), 'utf8')).resolves.toContain(
			'Harald'
		);
		await expect(fs.readFile(path.join(agentRoot, 'SOUL.md'), 'utf8')).resolves.toContain(
			'Direct'
		);
		await expect(fs.access(path.join(agentRoot, 'BOOTSTRAP.md'))).rejects.toThrow();
		await fs.rm(root, { recursive: true, force: true });
	});

	it('keeps the individual startup file tool available for bootstrap fallback edits', async () => {
		const root = await makeTempDir();
		const services = {
			...makeToolContext().services,
			startupFiles: new AgentStartupFilesService({
				rootPath: path.join(root, 'agent', 'workspaces'),
			}),
		};
		const ctx = makeToolContext({ agentId: 'main', services });

		const wrote = await startupFilesTool.execute(
			{
				action: 'write',
				name: 'IDENTITY.md',
				content: 'identity',
			},
			ctx
		);
		const read = await startupFilesTool.execute({ action: 'read', name: 'IDENTITY.md' }, ctx);

		expect(wrote.status).toBe('ok');
		expect(read.content[0]?.text).toContain('identity');
		await fs.rm(root, { recursive: true, force: true });
	});
});
