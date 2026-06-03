import { ToolPolicyService, type ToolPolicyServicePort, type ToolPolicySubject, type ToolProfile } from '../shared/tool-types';
import type { AgentTool } from './tool';
import { normalizeToolName } from './common';
import {
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	type AgentToolApprovalPolicy,
	type AgentToolName,
	type AgentToolGroupName,
	type AgentToolProfile,
} from '../../../shared/tools';
import { openBrowserTool } from '../web/open-browser';
import { webFetchTool } from '../web/web-fetch';
import { cronCreateTool } from '../cron/create';
import { cronDeleteTool } from '../cron/delete';
import { cronListTool } from '../cron/list';
import { cronReadTool } from '../cron/read';
import { cronRunTool } from '../cron/run';
import { cronStartTool } from '../cron/start';
import { cronStopTool } from '../cron/stop';
import { cronUpdateTool } from '../cron/update';
import { fileDeleteTool } from '../base/delete';
import { fileEditTool } from '../base/edit';
import { fileReadTool } from '../base/read';
import { bashTool } from '../base/exec';
import { scriptRunTool } from '../base/run_script';
import { searchFilesTool } from '../base/find';
import { fileWriteTool } from '../base/write';
import { completeTaskTool } from '../state/todo/complete';
import { listTodosTool } from '../state/todo/list';
import { readScratchTool } from '../state/scratch/read';
import { updateTodoTool } from '../state/todo/update';
import { writeScratchTool } from '../state/scratch/write';
import { writeTodosTool } from '../state/todo/write';
import { skillListTool } from '../skills/skill-list';
import { skillLoadTool } from '../skills/load-skill';
import { skillUseTool } from '../skills/use-skill';
import { mcpCallToolTool } from '../mcp/tool/call';
import { mcpConnectServerTool } from '../mcp/server/connect';
import { mcpListPromptsTool } from '../mcp/prompt/list';
import { mcpListResourcesTool } from '../mcp/resource/list';
import { mcpListServersTool } from '../mcp/server/list';
import { mcpListToolsTool } from '../mcp/tool/list';
import { mcpLoadPromptTool } from '../mcp/prompt/load';
import { mcpLoadToolTool } from '../mcp/tool/load';
import { mcpReadResourceTool } from '../mcp/resource/read';
import { mcpRefreshServerTool } from '../mcp/server/refresh';

export type LocalToolProfile = AgentToolProfile;
export type LocalToolGroup = AgentToolGroupName;
export type LocalToolApprovalPolicy = AgentToolApprovalPolicy;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocalToolImplementation = AgentTool<any, any>;

const LOCAL_TOOL_NAMES = [
	...AGENT_TOOL_NAMES,
	'script_run',
	'cron_create',
	'cron_read',
	'cron_update',
	'cron_delete',
	'cron_list',
	'cron_start',
	'cron_stop',
	'cron_run',
] as const satisfies readonly AgentToolName[];

export interface LocalToolCatalogEntry {
	name: AgentToolName;
	tool: LocalToolImplementation;
	group: LocalToolGroup;
	profiles: readonly LocalToolProfile[];
	approval: LocalToolApprovalPolicy;
	ownerOnly?: boolean;
}

function localTool(name: AgentToolName, tool: LocalToolImplementation): LocalToolCatalogEntry {
	const metadata = AGENT_TOOL_METADATA_BY_NAME[name];
	const entry = {
		name,
		tool,
		group: metadata.group,
		profiles: metadata.profiles,
		approval: metadata.approval,
	};
	const ownerOnly = tool.ownerOnly;
	return ownerOnly === undefined ? entry : { ...entry, ownerOnly };
}

const LOCAL_TOOL_IMPLEMENTATIONS = {
	file_read: fileReadTool,
	file_edit: fileEditTool,
	search_files: searchFilesTool,
	bash: bashTool,
	file_write: fileWriteTool,
	file_delete: fileDeleteTool,
	write_todos: writeTodosTool,
	update_todo: updateTodoTool,
	list_todos: listTodosTool,
	complete_task: completeTaskTool,
	write_scratch: writeScratchTool,
	read_scratch: readScratchTool,
	skill_list: skillListTool,
	skill_load: skillLoadTool,
	skill_use: skillUseTool,
	mcp_list_servers: mcpListServersTool,
	mcp_connect_server: mcpConnectServerTool,
	mcp_refresh_server: mcpRefreshServerTool,
	mcp_list_tools: mcpListToolsTool,
	mcp_load_tool: mcpLoadToolTool,
	mcp_call_tool: mcpCallToolTool,
	mcp_list_resources: mcpListResourcesTool,
	mcp_read_resource: mcpReadResourceTool,
	mcp_list_prompts: mcpListPromptsTool,
	mcp_load_prompt: mcpLoadPromptTool,
	web_fetch: webFetchTool,
	open_browser: openBrowserTool,
	script_run: scriptRunTool,
	cron_create: cronCreateTool,
	cron_read: cronReadTool,
	cron_update: cronUpdateTool,
	cron_delete: cronDeleteTool,
	cron_list: cronListTool,
	cron_start: cronStartTool,
	cron_stop: cronStopTool,
	cron_run: cronRunTool,
} as const satisfies Record<(typeof LOCAL_TOOL_NAMES)[number], LocalToolImplementation>;

export const LOCAL_TOOL_CATALOG = LOCAL_TOOL_NAMES.map((name) =>
	localTool(name, LOCAL_TOOL_IMPLEMENTATIONS[name])
) as readonly LocalToolCatalogEntry[];

export function localToolNamesForProfile(profile: LocalToolProfile): string[] {
	return LOCAL_TOOL_CATALOG.filter((entry) => entry.profiles.includes(profile)).map(
		(entry) => entry.name
	);
}

export function localToolNamesForGroup(group: LocalToolGroup): string[] {
	return LOCAL_TOOL_CATALOG.filter((entry) => entry.group === group).map((entry) => entry.name);
}

export function localToolCatalogByName(): ReadonlyMap<string, LocalToolCatalogEntry> {
	return new Map(LOCAL_TOOL_CATALOG.map((entry) => [entry.name, entry]));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRELOADED_LOCAL_TOOLS: AgentTool<any, any>[] = LOCAL_TOOL_CATALOG.map(
	(entry) => entry.tool
);

export const ALL_TOOLS = PRELOADED_LOCAL_TOOLS;

export interface ToolRegistryConfig {
	profile: ToolProfile;
	allow: string[];
	alsoAllow?: string[];
	deny: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
}

const defaultToolPolicyService = new ToolPolicyService();

export function createTools(
	cfg: ToolRegistryConfig,
	policy: Pick<ToolPolicyServicePort, 'evaluateTools'> = defaultToolPolicyService
): AgentTool[] {
	const tools = PRELOADED_LOCAL_TOOLS as unknown as AgentTool[];
	const catalog = localToolCatalogByName();
	const subjects: ToolPolicySubject[] = tools.map((tool) => {
		const entry = catalog.get(tool.name);
		return {
			name: tool.name,
			ownerOnly: entry?.ownerOnly,
			groups: entry ? [`group:${entry.group}`] : undefined,
		};
	});
	const result = policy.evaluateTools(subjects, {
		stages: {
			profile: { profile: cfg.profile, alsoAllow: cfg.alsoAllow },
			runtime: {
				allow: cfg.allow.length > 0 ? cfg.allow : undefined,
				deny: cfg.deny,
			},
		},
	});
	return tools.filter((tool) => result.allowed.has(normalizeToolName(tool.name)));
}
