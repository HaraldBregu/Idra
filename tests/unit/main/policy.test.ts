import path from 'node:path';
import { PolicyService, type PolicyStoreAccessor } from '../../../src/main/policy';
import type { PolicyConfig } from '../../../src/shared/policy';

function makePolicyService(policy: () => PolicyConfig) {
	const accessor = {
		read: jest.fn(policy),
		write: jest.fn(),
	};
	return { accessor, service: new PolicyService({ storeAccessor: accessor }) };
}

describe('policy module', () => {
	it('evaluates the active policy through the service', () => {
		const config: PolicyConfig = {
			version: 1,
			defaultPolicy: 'deny',
			paths: [],
		};
		const { service } = makePolicyService(() => config);

		expect(service.evaluate('relative.txt', 'read')).toMatchObject({
			path: path.resolve('relative.txt'),
			outcome: 'deny',
			matched: null,
			reason: "no matching path entry; default policy 'deny' applied",
		});
	});

	it('reads the active store policy for each service evaluation', () => {
		let activePolicy: PolicyConfig = {
			version: 1,
			defaultPolicy: 'deny',
			paths: [{ path: '/workspace', permissions: ['read'], recursive: true }],
		};
		const { accessor, service } = makePolicyService(() => activePolicy);

		expect(service.evaluate('/workspace/readme.md', 'read')).toMatchObject({
			outcome: 'allow',
			reason: "'read' granted by /workspace",
		});

		activePolicy = {
			version: 1,
			defaultPolicy: 'deny',
			paths: [
				{ path: '/workspace', permissions: ['read'], recursive: true },
				{ path: '/workspace/private', permissions: [], recursive: true },
			],
		};

		expect(service.evaluate('/workspace/private/secret.md', 'read')).toMatchObject({
			outcome: 'deny',
			reason: "'read' not in grants for /workspace/private",
		});
		expect(accessor.read).toHaveBeenCalledTimes(3);
	});

	it('initializes missing policy state with documented default grants', () => {
		const accessor = {
			read: jest.fn(() => undefined),
			write: jest.fn(),
		} satisfies PolicyStoreAccessor;
		const service = new PolicyService({ storeAccessor: accessor });
		const expected = {
			version: 1,
			defaultPolicy: 'deny' as const,
			paths: [
				{
					path: '/workspace',
					permissions: ['read', 'write', 'create', 'delete'],
					recursive: true,
				},
				{
					path: '/agent',
					permissions: ['read', 'write', 'create', 'delete'],
					recursive: true,
				},
			],
		};

		expect(service.getPolicy()).toEqual(expected);
		expect(accessor.write).toHaveBeenCalledWith(expected);
	});

	it('normalizes policy grants while preserving valid path order', () => {
		let stored: unknown = {
			version: 1,
			defaultPolicy: 'allow',
			paths: [
				{
					path: ' /tmp/friday ',
					permissions: ['read', 'unknown', 'write'],
					recursive: true,
				},
				{
					path: '/tmp/friday/private',
					permissions: [],
					recursive: true,
				},
				{
					path: '/tmp/friday/../secrets',
					permissions: ['read'],
					recursive: true,
				},
				{
					path: 'relative/path',
					permissions: ['read'],
					recursive: true,
				},
			],
		};
		const service = new PolicyService({
			storeAccessor: {
			read: jest.fn(() => stored),
			write: jest.fn((value) => {
				stored = value;
			}),
			},
		});

		expect(service.getPolicy()).toEqual({
			version: 1,
			defaultPolicy: 'allow',
			paths: [
				{ path: '/tmp/friday', permissions: ['read', 'write'], recursive: true },
				{ path: '/tmp/friday/private', permissions: [], recursive: true },
			],
		});
	});

	it('rejects unsupported policy versions without replacing the stored policy', () => {
		let stored: PolicyConfig = {
			version: 1,
			defaultPolicy: 'allow',
			paths: [{ path: '/tmp/friday', permissions: ['read'], recursive: true }],
		};
		const accessor = {
			read: jest.fn(() => stored),
			write: jest.fn((value: PolicyConfig) => {
				stored = value;
			}),
		};
		const service = new PolicyService({ storeAccessor: accessor });

		expect(service.setPolicy(stored)).toEqual(stored);
		expect(() => service.setPolicy({ version: 2, defaultPolicy: 'deny', paths: [] })).toThrow(
			'Unsupported policy version.'
		);
		expect(stored).toEqual({
			version: 1,
			defaultPolicy: 'allow',
			paths: [{ path: '/tmp/friday', permissions: ['read'], recursive: true }],
		});
	});

	it('evaluates tool availability through the policy service', () => {
		const { service } = makePolicyService(() => ({ version: 1, defaultPolicy: 'deny', paths: [] }));
		const decision = service.evaluateTools(
			[
				{ name: 'read' },
				{ name: 'write' },
				{ name: 'calendar_search', pluginId: 'calendar', ownerKind: 'plugin' },
				{ name: 'owner_secret', ownerOnly: true },
			],
			{
				sender: { isOwner: false },
				stages: {
					profile: { allow: ['group:file', 'calendar', 'owner_secret'] },
					sandbox: { deny: ['write'] },
				},
			}
		);

		expect([...decision.allowed]).toEqual(['read', 'calendar_search']);
		expect(decision.filtered).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ toolName: 'owner_secret', stage: 'ownerOnly' }),
				expect.objectContaining({ toolName: 'write', stage: 'sandbox' }),
			])
		);
	});

	it('evaluates tool use approval and loop decisions through the policy service', () => {
		const { service } = makePolicyService(() => ({ version: 1, defaultPolicy: 'deny', paths: [] }));

		expect(
			service.evaluateToolUse({
				toolName: 'write',
				params: { path: 'a' },
				callCount: 1,
				requiresApproval: true,
				approvalCached: false,
			})
		).toMatchObject({
			outcome: 'deny',
			status: 'rejected',
			deniedReason: 'approval_required',
			key: 'write::{"path":"a"}',
		});

		expect(
			service.evaluateToolUse({
				toolName: 'read',
				callCount: 6,
				loopStopAt: 5,
			})
		).toMatchObject({
			outcome: 'deny',
			status: 'error',
			deniedReason: 'loop_detected',
		});
	});

	it('evaluates request-level tool use through the policy service', () => {
		const { service } = makePolicyService(() => ({ version: 1, defaultPolicy: 'deny', paths: [] }));

		expect(service.evaluateToolRequest({ userRequest: 'read a file' })).toEqual({
			shouldUseTools: true,
			reason: '',
		});
	});

	it('evaluates hook and approval decisions through the policy service', () => {
		const { service } = makePolicyService(() => ({ version: 1, defaultPolicy: 'deny', paths: [] }));

		expect(
			service.evaluateToolHook({
				toolName: 'plugin_action',
				allow: false,
				reason: 'blocked by hook',
			})
		).toEqual({
			outcome: 'deny',
			reason: 'blocked by hook',
			deniedReason: 'hook_veto',
		});

		expect(
			service.evaluateToolApproval({
				toolName: 'plugin_action',
				approvalAvailable: true,
				approvalDecision: 'allow-always',
			})
		).toEqual({ outcome: 'allow', resolution: 'allow-always' });

		expect(
			service.evaluateToolApproval({
				toolName: 'plugin_action',
				approvalAvailable: false,
				requiredReason: 'approval missing',
			})
		).toMatchObject({
			outcome: 'deny',
			resolution: 'deny',
			deniedReason: 'approval_required',
		});
	});

	it('registers policy rules and reports evaluation errors', () => {
		const logger = { error: jest.fn() };
		const { service } = makePolicyService(() => ({ version: 1, defaultPolicy: 'deny', paths: [] }));
		const reportingService = new PolicyService({ logger });

		service.registerRule('toolRequest', () => ({
			shouldUseTools: false,
			reason: 'custom rule',
		}));

		expect(service.evaluateToolRequest({ userRequest: 'hello' })).toEqual({
			shouldUseTools: false,
			reason: 'custom rule',
		});

		reportingService.registerRule('toolRequest', () => {
			throw new Error('rule failed');
		});

		expect(() => reportingService.evaluateToolRequest({ userRequest: 'hello' })).toThrow(
			'rule failed'
		);
		expect(logger.error).toHaveBeenCalledWith(
			'PolicyService',
			"Policy rule 'toolRequest' evaluation failed",
			expect.objectContaining({
				rule: 'toolRequest',
				error: expect.objectContaining({ message: 'rule failed' }),
			})
		);
	});
});
