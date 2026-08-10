import {
	DEFAULT_PERMISSIONS,
	PERMISSION_TOOLS,
} from '../../../../../src/main/agent/permissions/permissions_types';

const ASK_BY_DEFAULT = ['edit_file', 'apply_patch', 'exec_command'] as const;

const ALLOW_BY_DEFAULT = [
	'read_file',
	'write_file',
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
	'search_web',
	'fetch_web_page',
	'use_web_browser',
	'create_image',
	'create_video',
	'create_sound',
	'save_memory',
	'forget_memory',
	'list_memories',
	'query_knowledge',
	'ingest_wiki_source',
	'save_wiki_analysis',
	'lint_wiki',
	'review_wiki_changes',
	'rebuild_wiki_index',
	'get_recent_wiki_activity',
	'load_skill',
	'update_health',
	'update_health_settings',
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
	it('uses the current nested permission schema', () => {
		expect(Object.keys(DEFAULT_PERMISSIONS).sort()).toEqual(['directories', 'tools']);
		expect(DEFAULT_PERMISSIONS.directories).toEqual([]);
		expect(Object.keys(DEFAULT_PERMISSIONS.tools).sort()).toEqual([...PERMISSION_TOOLS].sort());
	});

	it('asks only for destructive core capabilities by default', () => {
		const classified = [...ASK_BY_DEFAULT, ...ALLOW_BY_DEFAULT];
		expect(new Set(classified).size).toBe(classified.length);
		expect([...classified].sort()).toEqual([...PERMISSION_TOOLS].sort());

		for (const toolName of ASK_BY_DEFAULT)
			expect(DEFAULT_PERMISSIONS.tools[toolName]).toEqual({
				default: 'ask',
				allow: [],
				deny: [],
				ask: [],
			});
		for (const toolName of ALLOW_BY_DEFAULT)
			expect(DEFAULT_PERMISSIONS.tools[toolName]).toEqual({
				default: 'allow',
				allow: [],
				deny: [],
				ask: [],
			});
	});
});
