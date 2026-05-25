import path from 'node:path';
import { evaluate, PolicyService } from '../../../src/main/policy';
import type { PolicyConfig } from '../../../src/shared/policy';

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
		const store = {
			getPolicy: jest.fn(() => activePolicy),
		};
		const service = new PolicyService(store);

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
		expect(store.getPolicy).toHaveBeenCalledTimes(2);
	});
});
