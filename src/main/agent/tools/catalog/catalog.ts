import type { AgentTool } from '../core/types';
import {
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	type AgentToolApprovalPolicy,
	type AgentDefaultToolName,
	type AgentToolGroupName,
	type AgentToolProfile,
} from '../../../../shared/tools';
import {
	editFileTool,
	gitDiffTool,
	gitStatusTool,
	grepTool,
	listDirectoryTool,
	readFileTool,
	runShellTool,
	searchFilesTool,
	undoLastOperationTool,
	writeFileTool,
} from '../workspace/tools';
import {
	completeTaskTool,
	listTodosTool,
	readScratchTool,
	updateTodoTool,
	writeScratchTool,
	writeTodosTool,
} from '../state/tools';
import {
	presentPlanTool,
	requestApprovalTool,
	requestAuthorizationTool,
	requestClarificationTool,
} from '../human/tools';
import { spawnSubagentTool } from '../subagent/tools';
import { listSkillsTool, loadSkillTool, useSkillTool } from '../skills/tools';
import {
	callMcpToolTool,
	connectMcpServerTool,
	listMcpPromptsTool,
	listMcpResourcesTool,
	listMcpServersTool,
	listMcpToolsTool,
	loadMcpPromptTool,
	loadMcpToolTool,
	readMcpResourceTool,
	refreshMcpServerTool,
} from '../mcp/tools';

export type LocalToolProfile = AgentToolProfile;
export type LocalToolGroup = AgentToolGroupName;
export type LocalToolApprovalPolicy = AgentToolApprovalPolicy;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocalToolImplementation = AgentTool<any, any>;

export interface LocalToolCatalogEntry {
	name: AgentDefaultToolName;
	tool: LocalToolImplementation;
	group: LocalToolGroup;
	profiles: readonly LocalToolProfile[];
	approval: LocalToolApprovalPolicy;
	ownerOnly?: boolean;
}

function localTool(name: AgentDefaultToolName, tool: LocalToolImplementation): LocalToolCatalogEntry {
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
	write_file: writeFileTool,
	edit_file: editFileTool,
	list_directory: listDirectoryTool,
	search_files: searchFilesTool,
	grep: grepTool,
	run_shell: runShellTool,
	git_status: gitStatusTool,
	git_diff: gitDiffTool,
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
} as const satisfies Record<AgentDefaultToolName, LocalToolImplementation>;

export const LOCAL_TOOL_CATALOG = AGENT_TOOL_NAMES.map((name) =>
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
