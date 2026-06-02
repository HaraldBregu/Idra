import type { AgentTool } from '../base/tool';
import {
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	type AgentToolApprovalPolicy,
	type AgentToolName,
	type AgentToolGroupName,
	type AgentToolProfile,
} from '../../../shared/tools';
import { openBrowserTool, webFetchTool } from '../list_directory/app';
import {
	cronCreateTool,
	cronDeleteTool,
	cronListTool,
	cronReadTool,
	cronRunTool,
	cronStartTool,
	cronStopTool,
	cronUpdateTool,
} from '../list_directory/cron';
import { editFileTool } from '../list_directory/edit';
import { grepTool } from '../list_directory/grep';
import { listDirectoryTool } from '../list_directory/list';
import { readFileTool } from '../list_directory/read';
import { runShellTool } from '../list_directory/exec/shell';
import { scriptRunTool } from '../list_directory/script';
import { searchFilesTool } from '../list_directory/search';
import { undoLastOperationTool } from '../list_directory/undo';
import { writeTool } from '../list_directory/write';
import { completeTaskTool } from '../list_directory/state/complete-task';
import { listTodosTool } from '../list_directory/state/list-todos';
import { readScratchTool } from '../list_directory/state/read-scratch';
import { updateTodoTool } from '../list_directory/state/update-todo';
import { writeScratchTool } from '../list_directory/state/write-scratch';
import { writeTodosTool } from '../list_directory/state/write-todos';
import { presentPlanTool } from '../list_directory/human/present';
import { requestApprovalTool } from '../list_directory/human/confirm';
import { requestAuthorizationTool } from '../list_directory/human/authorize';
import { requestClarificationTool } from '../list_directory/human/ask';
import { spawnSubagentTool } from '../list_directory/subagent/spawn-subagent';
import { listSkillsTool } from '../list_directory/skills/list-skills';
import { loadSkillTool } from '../list_directory/skills/load-skill';
import { useSkillTool } from '../list_directory/skills/use-skill';
import { callMcpToolTool } from '../list_directory/mcp/call-mcp-tool';
import { connectMcpServerTool } from '../list_directory/mcp/connect-mcp-server';
import { listMcpPromptsTool } from '../list_directory/mcp/list-mcp-prompts';
import { listMcpResourcesTool } from '../list_directory/mcp/list-mcp-resources';
import { listMcpServersTool } from '../list_directory/mcp/list-mcp-servers';
import { listMcpToolsTool } from '../list_directory/mcp/list-mcp-tools';
import { loadMcpPromptTool } from '../list_directory/mcp/load-mcp-prompt';
import { loadMcpToolTool } from '../list_directory/mcp/load-mcp-tool';
import { readMcpResourceTool } from '../list_directory/mcp/read-mcp-resource';
import { refreshMcpServerTool } from '../list_directory/mcp/refresh-mcp-server';

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
