export type PermissionMode = 'allow' | 'deny' | 'ask';

export type PermissionBucket = 'allow' | 'deny' | 'ask';

export interface ToolPermission {
	default: PermissionMode;
	allow: string[];
	deny: string[];
	ask: string[];
}

export interface DirectoryPermission {
	recoursive: boolean;
	tools: '*' | string[];
}

export type DirectoryPermissions = Record<string, DirectoryPermission>;

export type PermissionsSchema = Record<
	string,
	ToolPermission | DirectoryPermissions | AgentPermissionMode
> & {
	dir: DirectoryPermissions;
	mode: AgentPermissionMode;
};

export const PERMISSION_TOOLS = [
	'read_file',
	'write_file',
	'edit_file',
	'apply_patch',
	'exec_command',
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
	'update_health_cheeck',
	'update_health_cheeck_settings',
	'load_skill',
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

const allow = (): ToolPermission => ({ default: 'allow', allow: [], deny: [], ask: [] });
const ask = (): ToolPermission => ({ default: 'ask', allow: [], deny: [], ask: [] });

const ALL_ALLOWED_TOOL_PERMISSIONS = Object.fromEntries(
	PERMISSION_TOOLS.map((toolName) => [toolName, allow()])
) as Record<string, ToolPermission>;

export const ALL_ALLOWED_PERMISSIONS: PermissionsSchema = {
	dir: {},
	mode: 'ask',
	...ALL_ALLOWED_TOOL_PERMISSIONS,
};

export const DEFAULT_TOOL_PERMISSIONS: Record<string, ToolPermission> = {
	read_file: allow(),
	write_file: allow(),
	edit_file: ask(),
	apply_patch: ask(),
	exec_command: ask(),
	process: allow(),
	web_search: allow(),
	web_fetch: allow(),
	web_browser: allow(),
	create_image: allow(),
	create_video: allow(),
	create_sound: allow(),
	memory_save: allow(),
	memory_forget: allow(),
	memory_list: allow(),
	query_knowledge: allow(),
	ingest_wiki_source: allow(),
	save_wiki_analysis: allow(),
	lint_wiki: allow(),
	review_wiki_changes: allow(),
	rebuild_wiki_index: allow(),
	get_recent_wiki_activity: allow(),
	update_health_cheeck: allow(),
	update_health_cheeck_settings: allow(),
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
	dir: {},
	mode: 'ask',
	...DEFAULT_TOOL_PERMISSIONS,
};
import type { AgentPermissionMode } from '../../../shared/agent_types';
