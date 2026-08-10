import {
	DEFAULT_PERMISSIONS,
	PERMISSION_TOOLS,
} from '../../../../../src/main/agent/permissions/permissions_types';

const ASK_BY_DEFAULT = [
	'edit',
	'apply_patch',
	'exec',
] as const;

const ALLOW_BY_DEFAULT = [
	'read',
	'write',
	'process',
	'recorder_microphone',
	'recorder_microphone_status',
	'recorder_microphone_stop',
	'recorder_camera',
	'recorder_camera_status',
	'recorder_camera_stop',
	'recorder_screen',
	'recorder_screen_status',
	'recorder_screen_stop',
	'web_search',
	'web_fetch',
	'web_browser',
	'create_image',
	'create_video',
	'create_sound',
	'memory_save',
	'memory_forget',
	'memory_list',
	'knowledge_query',
	'wiki_ingest_source',
	'wiki_save_analysis',
	'wiki_lint',
	'wiki_review_changes',
	'wiki_rebuild_index',
	'wiki_get_recent_activity',
	'load_skill',
	'health_update',
	'health_settings_update',
	'create_schedule',
	'update_schedule',
	'pause_schedule',
	'resume_schedule',
	'delete_schedule',
	'get_schedule',
	'list_schedules',
	'run_schedule_now',
	'list_extensions',
	'open_extensions',
	'complete_bootstrap',
	'subagent',
	'subagents',
] as const;

describe('DEFAULT_PERMISSIONS', () => {
	it('uses a complete top-level tool permission schema', () => {
		expect(Object.keys(DEFAULT_PERMISSIONS).sort()).toEqual(
			['dir', 'mode', ...PERMISSION_TOOLS].sort()
		);
		expect(DEFAULT_PERMISSIONS.dir).toEqual({});
		expect(DEFAULT_PERMISSIONS.mode).toBe('ask');
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('permissions');
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('defaultMode');
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('defaultPermissions');
	});

	it('asks only for destructive core capabilities by default', () => {
		const classified = [...ASK_BY_DEFAULT, ...ALLOW_BY_DEFAULT];
		expect(new Set(classified).size).toBe(classified.length);
		expect([...classified].sort()).toEqual([...PERMISSION_TOOLS].sort());

		for (const toolName of ASK_BY_DEFAULT)
			expect(DEFAULT_PERMISSIONS[toolName]).toEqual({
				default: 'ask',
				allow: [],
				deny: [],
				ask: [],
			});
		for (const toolName of ALLOW_BY_DEFAULT)
			expect(DEFAULT_PERMISSIONS[toolName]).toEqual({
				default: 'allow',
				allow: [],
				deny: [],
				ask: [],
			});
	});
});
