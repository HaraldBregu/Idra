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

export const POLICY_TOOLS = [
	'read',
	'write',
	'edit',
	'apply_patch',
	'exec',
	'process',
	'web_search',
	'web_fetch',
	'web_browser',
	'create_image',
	'create_video',
	'create_sound',
	'memory_save',
	'memory_forget',
	'knowledge_search',
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
	'complete_bootstrap',
	'subagent',
] as const;

const allow = (): ToolPermission => ({ default: 'allow', allow: [], deny: [], ask: [] });
const ask = (): ToolPermission => ({ default: 'ask', allow: [], deny: [], ask: [] });

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
	knowledge_search: allow(),
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
	complete_bootstrap: allow(),
	subagent: allow(),
};

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	dir: {},
	mode: 'ask',
	...DEFAULT_TOOL_PERMISSIONS,
};
import type { AgentPermissionMode } from '../../../shared/agent_types';
