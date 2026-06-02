import type { AgentTool } from '../base/tool';
import {
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	type AgentToolApprovalPolicy,
	type AgentToolName,
	type AgentToolGroupName,
	type AgentToolProfile,
} from '../../../shared/tools';
import { openBrowserTool, webFetchTool } from '../list/web_fetch';
import {
	cronCreateTool,
	cronDeleteTool,
	cronListTool,
	cronReadTool,
	cronRunTool,
	cronStartTool,
	cronStopTool,
	cronUpdateTool,
} from '../list/cron';
import { editFileTool } from '../list/edit_file';
import { grepTool } from '../list/grep';
import { listDirectoryTool } from '../list/list_directory';
import { readFileTool } from '../list/read_file';
import { runShellTool } from '../list/run_shell';
import { scriptRunTool } from '../list/script_run';
import { searchFilesTool } from '../list/search_files';
import { undoLastOperationTool } from '../list/undo_last_operation';
import { writeTool } from '../list/write';
import { completeTaskTool } from '../list/complete_task';
import { listTodosTool } from '../list/list_todos';
import { readScratchTool } from '../list/read_scratch';
import { updateTodoTool } from '../list/update_todo';
import { writeScratchTool } from '../list/write_scratch';
import { writeTodosTool } from '../list/write_todos';
import { presentPlanTool } from '../list/present_plan';
import { requestApprovalTool } from '../list/request_approval';
import { requestAuthorizationTool } from '../list/request_authorization';
import { requestClarificationTool } from '../list/request_clarification';
import { spawnSubagentTool } from '../list/spawn_subagent';
import { listSkillsTool } from '../list/list_skills';
import { loadSkillTool } from '../list/load_skill';
import { useSkillTool } from '../list/use_skill';
import { callMcpToolTool } from '../list/call_mcp_tool';
import { connectMcpServerTool } from '../list/connect_mcp_server';
import { listMcpPromptsTool } from '../list/list_mcp_prompts';
import { listMcpResourcesTool } from '../list/list_mcp_resources';
import { listMcpServersTool } from '../list/list_mcp_servers';
import { listMcpToolsTool } from '../list/list_mcp_tools';
import { loadMcpPromptTool } from '../list/load_mcp_prompt';
import { loadMcpToolTool } from '../list/load_mcp_tool';
import { readMcpResourceTool } from '../list/read_mcp_resource';
import { refreshMcpServerTool } from '../list/refresh_mcp_server';

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
	read_file: readFileTool,
	edit_file: editFileTool,
	list_directory: listDirectoryTool,
	search_files: searchFilesTool,
	grep: grepTool,
	run_shell: runShellTool,
	write: writeTool,
	undo_last_operation: undoLastOperationTool,
	write_todos: writeTodosTool,
	update_todo: updateTodoTool,
	list_todos: listTodosTool,
	complete_task: completeTaskTool,
	write_scratch: writeScratchTool,
	read_scratch: readScratchTool,
	request_approval: requestApprovalTool,
	request_clarification: requestClarificationTool,
	present_plan: presentPlanTool,
	request_authorization: requestAuthorizationTool,
	spawn_subagent: spawnSubagentTool,
	list_skills: listSkillsTool,
	load_skill: loadSkillTool,
	use_skill: useSkillTool,
	list_mcp_servers: listMcpServersTool,
	connect_mcp_server: connectMcpServerTool,
	refresh_mcp_server: refreshMcpServerTool,
	list_mcp_tools: listMcpToolsTool,
	load_mcp_tool: loadMcpToolTool,
	call_mcp_tool: callMcpToolTool,
	list_mcp_resources: listMcpResourcesTool,
	read_mcp_resource: readMcpResourceTool,
	list_mcp_prompts: listMcpPromptsTool,
	load_mcp_prompt: loadMcpPromptTool,
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
