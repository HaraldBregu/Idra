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
	'read',
	'write',
	'edit',
	'apply_patch',
	'exec',
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
	'knowledge_query',
	'wiki_ingest_source',
	'wiki_save_analysis',
	'wiki_lint',
	'wiki_review_changes',
	'wiki_rebuild_index',
	'wiki_get_recent_activity',
	'health_update',
	'health_settings_update',
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
	read: allow(),
	write: allow(),
	edit: ask(),
	apply_patch: ask(),
	exec: ask(),
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
	knowledge_query: allow(),
	wiki_ingest_source: allow(),
	wiki_save_analysis: allow(),
	wiki_lint: allow(),
	wiki_review_changes: allow(),
	wiki_rebuild_index: allow(),
	wiki_get_recent_activity: allow(),
	health_update: allow(),
	health_settings_update: allow(),
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
