import type { AgentTool } from '../base/tool';
import {
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	type AgentToolApprovalPolicy,
	type AgentToolName,
	type AgentToolGroupName,
	type AgentToolProfile,
} from '../../../shared/tools';
import { openBrowserTool } from '../list/open-browser';
import { webFetchTool } from '../list/web-fetch';
import { cronCreateTool } from '../list/cron-create';
import { cronDeleteTool } from '../list/cron-delete';
import { cronListTool } from '../list/cron-list';
import { cronReadTool } from '../list/cron-read';
import { cronRunTool } from '../list/cron-run';
import { cronStartTool } from '../list/cron-start';
import { cronStopTool } from '../list/cron-stop';
import { cronUpdateTool } from '../list/cron-update';
import { editFileTool } from '../list/edit-file';
import { grepTool } from '../list/grep';
import { listDirectoryTool } from '../list/list-directory';
import { readFileTool } from '../list/read-file';
import { runShellTool } from '../list/run-shell';
import { scriptRunTool } from '../list/script-run';
import { searchFilesTool } from '../list/search-files';
import { undoLastOperationTool } from '../list/undo-last-operation';
import { writeTool } from '../list/write';
import { completeTaskTool } from '../list/complete-task';
import { listTodosTool } from '../list/list-todos';
import { readScratchTool } from '../list/read-scratch';
import { updateTodoTool } from '../list/update-todo';
import { writeScratchTool } from '../list/write-scratch';
import { writeTodosTool } from '../list/write-todos';
import { presentPlanTool } from '../list/present-plan';
import { requestApprovalTool } from '../list/request-approval';
import { requestAuthorizationTool } from '../list/request-authorization';
import { requestClarificationTool } from '../list/request-clarification';
import { spawnSubagentTool } from '../list/spawn-subagent';
import { listSkillsTool } from '../list/list-skills';
import { loadSkillTool } from '../list/load-skill';
import { useSkillTool } from '../list/use-skill';
import { callMcpToolTool } from '../list/call-mcp-tool';
import { connectMcpServerTool } from '../list/connect-mcp-server';
import { listMcpPromptsTool } from '../list/list-mcp-prompts';
import { listMcpResourcesTool } from '../list/list-mcp-resources';
import { listMcpServersTool } from '../list/list-mcp-servers';
import { listMcpToolsTool } from '../list/list-mcp-tools';
import { loadMcpPromptTool } from '../list/load-mcp-prompt';
import { loadMcpToolTool } from '../list/load-mcp-tool';
import { readMcpResourceTool } from '../list/read-mcp-resource';
import { refreshMcpServerTool } from '../list/refresh-mcp-server';

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
