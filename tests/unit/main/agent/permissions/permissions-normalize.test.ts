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
	it('migrates legacy recorder permissions and directory tool names', () => {
		const normalized = normalizePermissionsSchema({
			mode: 'ask',
			dir: {
				'/captures': {
					recoursive: true,
					tools: ['recorder_camera_stop', 'camera_recorder_stop'],
				},
			},
			recorder_camera: {
				default: 'deny',
				allow: ['/captures'],
				deny: [],
				ask: [],
			},
		});

		expect(normalized.camera_recorder).toEqual({
			default: 'deny',
			allow: ['/captures'],
			deny: [],
			ask: [],
		});
		expect(normalized.dir).toEqual({
			'/captures': { recoursive: true, tools: ['camera_recorder_stop'] },
		});
		expect(normalized).not.toHaveProperty('recorder_camera');
	});

	it('keeps an explicit current recorder permission ahead of its legacy alias', () => {
		const normalized = normalizePermissionsSchema({
			recorder_screen: { default: 'deny', allow: [], deny: [], ask: [] },
			screen_recorder: { default: 'ask', allow: [], deny: [], ask: [] },
		});

		expect(normalized.screen_recorder).toMatchObject({ default: 'ask' });
		expect(normalized).not.toHaveProperty('recorder_screen');
	});

	it('migrates legacy task permissions to current tool names', () => {
		const normalized = normalizePermissionsSchema({
			create_schedule: { default: 'ask', allow: [], deny: [], ask: [] },
			dir: {
				'/tasks': { recoursive: false, tools: ['run_schedule_now'] },
			},
		});

		expect(normalized.create_task).toMatchObject({ default: 'ask' });
		expect(normalized.dir).toEqual({
			'/tasks': { recoursive: false, tools: ['run_task_now'] },
		});
		expect(normalized).not.toHaveProperty('create_schedule');
	});
});
