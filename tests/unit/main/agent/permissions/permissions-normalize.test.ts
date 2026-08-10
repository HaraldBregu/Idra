import { normalizeToolPermission } from '../../../../../src/main/agent/permissions/normalize_tool_permission';
import { normalizePermissionsSchema } from '../../../../../src/main/agent/permissions/normalize_permissions_schema';
import type { ToolPermission } from '../../../../../src/main/agent/permissions/permissions_types';

const fallback: ToolPermission = { default: 'ask', allow: [], deny: [], ask: [] };

describe('normalizeToolPermission', () => {
	it('keeps only the requested tool permission fields and normalizes lists', () => {
		expect(
			normalizeToolPermission(
				{
					default: 'allow',
					allow: [' Desktop ', 'Desktop', 42],
					deny: [],
					ask: [],
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
	it('normalizes current tool and directory permissions', () => {
		const normalized = normalizePermissionsSchema({
			tools: {
				camera_recorder: {
					default: 'deny',
					allow: ['/captures'],
					deny: [],
					ask: [],
				},
			},
			directories: [
				{
					path: ' /captures ',
					enabled: false,
					recoursive: true,
					tools: [' camera_recorder_stop ', 'camera_recorder_stop'],
				},
			],
		});

		expect(normalized.tools.camera_recorder).toEqual({
			default: 'deny',
			allow: ['/captures'],
			deny: [],
			ask: [],
		});
		expect(normalized.directories).toEqual([
			{
				path: '/captures',
				enabled: false,
				recoursive: true,
				tools: ['camera_recorder_stop'],
			},
		]);
	});

	it('keeps current custom tool permissions', () => {
		const normalized = normalizePermissionsSchema({
			tools: {
				mcp__records__lookup: { default: 'ask', allow: [], deny: [], ask: [] },
			},
		});

		expect(normalized.tools.mcp__records__lookup).toEqual({
			default: 'ask',
			allow: [],
			deny: [],
			ask: [],
		});
	});
});
