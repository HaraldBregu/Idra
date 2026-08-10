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
	'microphone_recorder',
	'microphone_recorder_status',
	'microphone_recorder_stop',
	'camera_recorder',
	'camera_recorder_status',
	'camera_recorder_stop',
	'screen_recorder',
	'screen_recorder_status',
	'screen_recorder_stop',
	'web_search',
	'web_fetch',
	'web_browser',
	'create_image',
	'create_video',
	'create_sound',
	'memory_save',
	'memory_forget',
	'memory_list',
	'query_knowledge',
	'ingest_wiki_source',
	'save_wiki_analysis',
	'lint_wiki',
	'review_wiki_changes',
	'rebuild_wiki_index',
	'get_recent_wiki_activity',
	'load_skill',
	'update_health_cheeck',
	'update_health_cheeck_settings',
	'create_task',
	'update_task',
	'pause_task',
	'resume_task',
	'delete_task',
	'get_task',
	'list_tasks',
	'run_task_now',
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
