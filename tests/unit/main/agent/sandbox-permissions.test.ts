import os from 'node:os';

const initialize = jest.fn().mockResolvedValue(undefined);
const wrapWithSandboxArgv = jest.fn().mockResolvedValue({ argv: ['/bin/sh', '-lc', 'pwd'], env: {} });

jest.mock('node:fs/promises', () => ({ mkdir: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@anthropic-ai/sandbox-runtime', () => ({
	SandboxManager: {
		initialize,
		wrapWithSandboxArgv,
		isSupportedPlatform: () => true,
		isSandboxingEnabled: () => false,
		reset: jest.fn(),
		cleanupAfterCommand: jest.fn(),
		annotateStderrWithSandboxFailures: (_id: string, stderr: string) => stderr,
	},
	VENDORED_SRT_WIN_EXE: '/vendor/srt-win.exe',
	installWindowsSandboxAsync: jest.fn(),
	resolveSrtWin: jest.fn(),
}));
jest.mock('../../../../src/main/agent/agent_store', () => ({
	getPermissions: () => ({
		read: { allow: ['/workspace/**'], deny: ['/workspace/private/**'] },
		write: { allow: ['/workspace/**'], deny: ['/workspace/private/**'] },
		exec: { allow: ['/workspace/**', '/shared/**'], deny: ['/shared/private/**'] },
	}),
}));

import { ExecSandbox } from '../../../../src/main/agent/sandbox';

describe('ExecSandbox permissions', () => {
	it('uses only execute paths as command read and write boundaries', async () => {
		const configuration = await (
			new ExecSandbox() as unknown as {
				configuration: () => Promise<{ config: { filesystem: Record<string, string[]> } }>;
			}
		).configuration();

		expect(configuration.config.filesystem.allowRead).toEqual(
			expect.arrayContaining(['/workspace/**', '/shared/**'])
		);
		expect(configuration.config.filesystem.allowWrite).toEqual(
			expect.arrayContaining(['/workspace/**', '/shared/**'])
		);
		expect(configuration.config.filesystem.denyRead).toEqual(
			expect.arrayContaining([os.homedir(), '/shared/private/**'])
		);
		expect(configuration.config.filesystem.denyRead).not.toContain('/workspace/private/**');
		expect(configuration.config.filesystem.denyWrite).toEqual(['/shared/private/**']);
	});

	it('adds an approved outside root only to the wrapped invocation', async () => {
		await new ExecSandbox().wrap('pwd', '/workspace', 'command', undefined, ['/outside']);
		expect(wrapWithSandboxArgv).toHaveBeenCalledWith(
			'pwd',
			'/bin/sh',
			expect.objectContaining({
				filesystem: expect.objectContaining({
					allowRead: expect.arrayContaining(['/outside/**']),
					allowWrite: expect.arrayContaining(['/outside/**']),
				}),
			}),
			undefined,
			'/workspace',
			{ commandId: 'command', commandText: 'pwd' }
		);
	});
});
