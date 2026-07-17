import { normalizeToolPermission } from '../../../../../src/main/agent/policy/policy_normalize';
import type { ToolPermission } from '../../../../../src/main/agent/policy/policy_types';

const fallback: ToolPermission = { default: 'ask', allow: [], deny: [], ask: [] };

describe('normalizeToolPermission', () => {
	it('keeps only the requested tool policy fields and normalizes lists', () => {
		expect(
			normalizeToolPermission(
				{
					default: 'allow',
					allow: [' Desktop ', 'Desktop', 42],
					deny: [],
					ask: [],
					permissions: { allow: ['legacy'] },
				},
				fallback
			)
		).toEqual({ default: 'allow', allow: ['Desktop'], deny: [], ask: [] });
	});

	it('returns independent fallback arrays for invalid entries', () => {
		const normalized = normalizeToolPermission(null, fallback);
		normalized.allow.push('/tmp');
		expect(fallback.allow).toEqual([]);
	});
});
