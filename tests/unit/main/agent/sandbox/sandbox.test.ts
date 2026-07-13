const getSandboxRoots = jest.fn();

jest.mock('../../../../../src/main/agent/sandbox/sandbox_store', () => ({
	getSandboxRoots,
}));

import { isWithinSandbox } from '../../../../../src/main/agent/sandbox/sandbox_check';

describe('isWithinSandbox', () => {
	beforeEach(() => getSandboxRoots.mockReset());

	it('is true when the dir is under a sandbox root', () => {
		getSandboxRoots.mockReturnValue(['/agent', '/tmp']);
		expect(isWithinSandbox('/tmp/work')).toBe(true);
		expect(isWithinSandbox('/agent')).toBe(true);
	});

	it('is false when the dir is outside all roots', () => {
		getSandboxRoots.mockReturnValue(['/agent', '/tmp']);
		expect(isWithinSandbox('/home/me')).toBe(false);
	});
});
