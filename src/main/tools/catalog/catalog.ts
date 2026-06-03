import type { AgentTool } from '../base/tool';
import {
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	type AgentToolApprovalPolicy,
	type AgentToolName,
	type AgentToolGroupName,
	type AgentToolProfile,
} from '../../../shared/tools';
import { openBrowserTool } from '../open-browser';
import { webFetchTool } from '../web-fetch';
import { cronCreateTool } from '../cron-create';
import { cronDeleteTool } from '../cron-delete';
import { cronListTool } from '../cron-list';
import { cronReadTool } from '../cron-read';
import { cronRunTool } from '../cron-run';
import { cronStartTool } from '../cron-start';
import { cronStopTool } from '../cron-stop';
import { cronUpdateTool } from '../cron-update';
import { editFileTool } from '../edit-file';
import { grepTool } from '../grep';
import { listDirectoryTool } from '../list-directory';
import { readFileTool } from '../read-file';
import { runShellTool } from '../run-shell';
import { scriptRunTool } from '../script-run';
import { searchFilesTool } from '../search-files';
import { undoLastOperationTool } from '../undo-last-operation';
import { writeFileTool } from '../write-file';
import { completeTaskTool } from '../complete-task';
import { listTodosTool } from '../list-todos';
import { readScratchTool } from '../read-scratch';
import { updateTodoTool } from '../update-todo';
import { writeScratchTool } from '../write-scratch';
import { writeTodosTool } from '../write-todos';
import { presentPlanTool } from '../present-plan';
import { requestApprovalTool } from '../request-approval';
import { requestAuthorizationTool } from '../request-authorization';
import { requestClarificationTool } from '../request-clarification';
import { spawnSubagentTool } from '../spawn-subagent';
import { listSkillsTool } from '../list-skills';
import { loadSkillTool } from '../load-skill';
import { useSkillTool } from '../use-skill';
import { callMcpToolTool } from '../call-mcp-tool';
import { connectMcpServerTool } from '../connect-mcp-server';
import { listMcpPromptsTool } from '../list-mcp-prompts';
import { listMcpResourcesTool } from '../list-mcp-resources';
import { listMcpServersTool } from '../list-mcp-servers';
import { listMcpToolsTool } from '../list-mcp-tools';
import { loadMcpPromptTool } from '../load-mcp-prompt';
import { loadMcpToolTool } from '../load-mcp-tool';
import { readMcpResourceTool } from '../read-mcp-resource';
import { refreshMcpServerTool } from '../refresh-mcp-server';

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
	write_file: writeFileTool,
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
