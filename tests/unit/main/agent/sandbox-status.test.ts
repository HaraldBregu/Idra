const checkDependenciesAsync = jest.fn();

jest.mock('@anthropic-ai/sandbox-runtime', () => ({
	SandboxManager: {
		isSupportedPlatform: jest.fn(() => true),
		checkDependenciesAsync,
	},
	VENDORED_SRT_WIN_EXE: '/app.asar/vendor/srt-win.exe',
	installWindowsSandboxAsync: jest.fn(),
	resolveSrtWin: jest.fn(),
}));

import { ExecSandbox } from '../../../../src/main/agent/sandbox';

it('adds Linux remediation when command sandbox dependencies are unavailable', async () => {
	jest.spyOn(process, 'platform', 'get').mockReturnValue('linux');
	checkDependenciesAsync.mockResolvedValue({ errors: ['bubblewrap is missing'], warnings: [] });

	await expect(new ExecSandbox().status()).resolves.toEqual({
		state: 'unavailable',
		platform: 'linux',
		message:
			'bubblewrap is missing\nAsk IT to provide bubblewrap, socat, and ripgrep and permit unprivileged user namespaces. Chat and non-command tools remain available.',
	});
});
