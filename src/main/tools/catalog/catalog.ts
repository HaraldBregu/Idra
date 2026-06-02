import type { AgentTool } from '../base/tool';
import {
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	type AgentToolApprovalPolicy,
	type AgentToolName,
	type AgentToolGroupName,
	type AgentToolProfile,
} from '../../../shared/tools';
import { openBrowserTool, webFetchTool } from '../app';
import {
	cronCreateTool,
	cronDeleteTool,
	cronListTool,
	cronReadTool,
	cronRunTool,
	cronStartTool,
	cronStopTool,
	cronUpdateTool,
} from '../../cron';
import { editFileTool } from '../list/edit';
import { grepTool } from '../list/grep';
import { listDirectoryTool } from '../list/list';
import { readFileTool } from '../list/read';
import { runShellTool } from '../exec/shell';
import { scriptRunTool } from '../script';
import { searchFilesTool } from '../list/search';
import { undoLastOperationTool } from '../list/undo';
import { writeTool } from '../list/write';
import { completeTaskTool } from '../state/complete-task';
import { listTodosTool } from '../state/list-todos';
import { readScratchTool } from '../state/read-scratch';
import { updateTodoTool } from '../state/update-todo';
import { writeScratchTool } from '../state/write-scratch';
import { writeTodosTool } from '../state/write-todos';
import { presentPlanTool } from '../human/present';
import { requestApprovalTool } from '../human/confirm';
import { requestAuthorizationTool } from '../human/authorize';
import { requestClarificationTool } from '../human/ask';
import { spawnSubagentTool } from '../subagent/spawn-subagent';
import { listSkillsTool } from '../skills/list-skills';
import { loadSkillTool } from '../skills/load-skill';
import { useSkillTool } from '../skills/use-skill';
import { callMcpToolTool } from '../mcp/call-mcp-tool';
import { connectMcpServerTool } from '../mcp/connect-mcp-server';
import { listMcpPromptsTool } from '../mcp/list-mcp-prompts';
import { listMcpResourcesTool } from '../mcp/list-mcp-resources';
import { listMcpServersTool } from '../mcp/list-mcp-servers';
import { listMcpToolsTool } from '../mcp/list-mcp-tools';
import { loadMcpPromptTool } from '../mcp/load-mcp-prompt';
import { loadMcpToolTool } from '../mcp/load-mcp-tool';
import { readMcpResourceTool } from '../mcp/read-mcp-resource';
import { refreshMcpServerTool } from '../mcp/refresh-mcp-server';

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
