import path from 'node:path';
import {
	evaluate,
	evaluateToolApprovalPolicy,
	evaluateToolHookPolicy,
	PolicyService,
	PolicyStore,
} from '../../../src/main/policy';
import type { PolicyConfig } from '../../../src/shared/policy';

function makePolicyStore(policy: () => PolicyConfig) {
	const accessor = {
		get: jest.fn(policy),
		set: jest.fn(),
	};
	return { accessor, store: new PolicyStore(accessor) };
}

describe('policy module', () => {
	it('evaluates a policy object directly', () => {
		const config: PolicyConfig = {
			version: 1,
			defaultPolicy: 'deny',
			paths: [],
		};

		expect(evaluate(config, 'relative.txt', 'read')).toMatchObject({
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
		const { accessor, store } = makePolicyStore(() => activePolicy);
		const service = new PolicyService({ store });

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
		expect(accessor.get).toHaveBeenCalledTimes(3);
	});

	it('initializes missing policy state with documented default grants', () => {
		const accessor = {
			get: jest.fn(() => undefined),
			set: jest.fn(),
		};
		const store = new PolicyStore(accessor);
		const expected = {
			version: 1,
			defaultPolicy: 'allow' as const,
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

		expect(accessor.set).toHaveBeenCalledWith('policy', expected);
		expect(store.getPolicy()).toEqual(expected);
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
		const store = new PolicyStore({
			get: jest.fn(() => stored),
			set: jest.fn((_key, value) => {
				stored = value;
			}),
		});

		expect(store.getPolicy()).toEqual({
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
			get: jest.fn(() => stored),
			set: jest.fn((_key, value: PolicyConfig) => {
				stored = value;
			}),
		};
		const store = new PolicyStore(accessor);

		expect(store.setPolicy(stored)).toEqual(stored);
		expect(() => store.setPolicy({ version: 2, defaultPolicy: 'deny', paths: [] })).toThrow(
			'Unsupported policy version.'
		);
		expect(stored).toEqual({
			version: 1,
			defaultPolicy: 'allow',
			paths: [{ path: '/tmp/friday', permissions: ['read'], recursive: true }],
		});
	});

	it('evaluates tool availability through the policy service', () => {
		const { store } = makePolicyStore(() => ({ version: 1, defaultPolicy: 'deny', paths: [] }));
		const service = new PolicyService({ store });
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
		const { store } = makePolicyStore(() => ({ version: 1, defaultPolicy: 'deny', paths: [] }));
		const service = new PolicyService({ store });

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
		const { store } = makePolicyStore(() => ({ version: 1, defaultPolicy: 'deny', paths: [] }));
		const service = new PolicyService({ store });

		expect(service.evaluateToolRequest({ userRequest: 'read a file' })).toEqual({
			shouldUseTools: true,
			reason: '',
		});
	});

	it('evaluates hook and approval decisions in the policy module', () => {
		expect(
			evaluateToolHookPolicy({
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
			evaluateToolApprovalPolicy({
				toolName: 'plugin_action',
				approvalAvailable: true,
				approvalDecision: 'allow-always',
			})
		).toEqual({ outcome: 'allow', resolution: 'allow-always' });

		expect(
			evaluateToolApprovalPolicy({
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
});
