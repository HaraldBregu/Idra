export type PermissionMode = 'allow' | 'deny' | 'ask';

export type PermissionBucket = 'allow' | 'deny' | 'ask';

export interface ToolPermission {
	default: PermissionMode;
	allow: string[];
	deny: string[];
	ask: string[];
}

export interface DirectoryPermission {
	path: string;
	enabled: boolean;
	recoursive: boolean;
	tools: '*' | string[];
}

export type DirectoryPermissions = DirectoryPermission[];

export interface PermissionsSchema {
	tools: Record<string, ToolPermission>;
	directories: DirectoryPermissions;
}

const allow = (): ToolPermission => ({ default: 'allow', allow: [], deny: [], ask: [] });
const ask = (): ToolPermission => ({ default: 'ask', allow: [], deny: [], ask: [] });

export const DEFAULT_TOOL_PERMISSIONS: Record<string, ToolPermission> = {
	read_file: allow(),
	write_file: ask(),
	edit_file: ask(),
	apply_patch: ask(),
	exec_command: allow(),
	process: allow(),
	search_web: allow(),
	fetch_web_page: allow(),
	use_web_browser: allow(),
	create_image: ask(),
	create_video: ask(),
	create_sound: ask(),
	save_memory: allow(),
	forget_memory: allow(),
	list_memories: allow(),
	query_knowledge: allow(),
	ingest_wiki_source: allow(),
	save_wiki_analysis: allow(),
	lint_wiki: allow(),
	review_wiki_changes: allow(),
	rebuild_wiki_index: allow(),
	get_recent_wiki_activity: allow(),
	update_health: allow(),
	update_health_settings: allow(),
	load_skill: allow(),
	create_task: allow(),
	update_task: allow(),
	pause_task: allow(),
	resume_task: allow(),
	delete_task: allow(),
	get_task: allow(),
	list_tasks: allow(),
	run_task_now: allow(),
	list_extensions: allow(),
	open_extensions: allow(),
	microphone_recorder: allow(),
	microphone_recorder_status: allow(),
	microphone_recorder_stop: allow(),
	camera_recorder: allow(),
	camera_recorder_status: allow(),
	camera_recorder_stop: allow(),
	screen_recorder: allow(),
	screen_recorder_status: allow(),
	screen_recorder_stop: allow(),
	complete_bootstrap: allow(),
	subagent: allow(),
	subagents: allow(),
};

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	tools: DEFAULT_TOOL_PERMISSIONS,
	directories: [],
};
