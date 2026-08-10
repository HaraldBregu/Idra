import { normalizeToolPermission } from '../../../../../src/main/agent/permissions/normalize_tool_permission';
import { normalizePermissionsSchema } from '../../../../../src/main/agent/permissions/normalize_permissions_schema';
import type { ToolPermission } from '../../../../../src/main/agent/permissions/permissions_types';

const fallback: ToolPermission = { default: 'ask', allow: [], deny: [], ask: [] };

describe('normalizeToolPermission', () => {
	it('keeps only permission fields and normalizes lists', () => {
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

describe('normalizePermissionsSchema', () => {
	it('normalizes current tool and directory entries', () => {
		const normalized = normalizePermissionsSchema({
			tools: {
				exec_command: { default: 'deny', allow: [' npm test '], deny: [], ask: [] },
			},
			directories: [
				{
					path: ' /workspace ',
					enabled: true,
					recoursive: true,
					tools: [' exec_command ', 'exec_command'],
				},
			],
		});

		expect(normalized.tools.exec_command).toEqual({
			default: 'deny',
			allow: ['npm test'],
			deny: [],
			ask: [],
		});
		expect(normalized.directories).toEqual([
			{
				path: '/workspace',
				enabled: true,
				recoursive: true,
				tools: ['exec_command'],
			},
		]);
	});

	it('uses defaults for invalid stored entries', () => {
		const normalized = normalizePermissionsSchema({
			tools: { exec_command: null },
			directories: 'invalid',
		});

		expect(normalized.tools.exec_command).toEqual(fallback);
		expect(normalized.directories).toEqual([]);
	});
});
