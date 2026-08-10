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
	'health_update',
	'health_settings_update',
	'load_skill',
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
	write: ask(),
	edit: ask(),
	apply_patch: ask(),
	exec: ask(),
	process: ask(),
	web_search: allow(),
	web_fetch: allow(),
	web_browser: ask(),
	create_image: allow(),
	create_video: allow(),
	create_sound: allow(),
	memory_save: allow(),
	memory_forget: allow(),
	memory_list: allow(),
	knowledge_query: allow(),
	wiki_ingest_source: ask(),
	wiki_save_analysis: ask(),
	wiki_lint: ask(),
	wiki_review_changes: ask(),
	wiki_rebuild_index: ask(),
	wiki_get_recent_activity: allow(),
	health_update: allow(),
	health_settings_update: allow(),
	load_skill: allow(),
	create_schedule: allow(),
	update_schedule: allow(),
	pause_schedule: allow(),
	resume_schedule: allow(),
	delete_schedule: allow(),
	get_schedule: allow(),
	list_schedules: allow(),
	run_schedule_now: allow(),
	list_extensions: allow(),
	open_extensions: allow(),
	recorder_microphone: allow(),
	recorder_microphone_status: allow(),
	recorder_microphone_stop: allow(),
	recorder_camera: allow(),
	recorder_camera_status: allow(),
	recorder_camera_stop: allow(),
	recorder_screen: allow(),
	recorder_screen_status: allow(),
	recorder_screen_stop: allow(),
	complete_bootstrap: ask(),
	subagent: allow(),
};

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	dir: {},
	mode: 'ask',
	...DEFAULT_TOOL_PERMISSIONS,
};
import type { AgentPermissionMode } from '../../../shared/agent_types';
