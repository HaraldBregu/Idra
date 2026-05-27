import type { AgentTool } from '../core/types';
import {
	AGENT_TOOL_APPROVAL_ALWAYS,
	AGENT_TOOL_APPROVAL_NONE,
	AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
	AGENT_TOOL_STANDARD_PROFILES,
	type AgentToolApprovalPolicy,
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
	name: string;
	tool: LocalToolImplementation;
	group: LocalToolGroup;
	profiles: readonly LocalToolProfile[];
	approval: LocalToolApprovalPolicy;
	ownerOnly?: boolean;
}

function localTool(definition: Omit<LocalToolCatalogEntry, 'name'>): LocalToolCatalogEntry {
	const entry = { name: definition.tool.name, ...definition };
	const ownerOnly = definition.ownerOnly ?? definition.tool.ownerOnly;
	return ownerOnly === undefined ? entry : { ...entry, ownerOnly };
}

export const LOCAL_TOOL_CATALOG = [
	localTool({
		tool: readFileTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: writeFileTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: editFileTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: listDirectoryTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: searchFilesTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: grepTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: runShellTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: gitStatusTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: gitDiffTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: undoLastOperationTool,
		group: 'coreWorkspace',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
	}),
	localTool({
		tool: writeTodosTool,
		group: 'stateTask',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: updateTodoTool,
		group: 'stateTask',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: listTodosTool,
		group: 'stateTask',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: completeTaskTool,
		group: 'stateTask',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: writeScratchTool,
		group: 'stateTask',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: readScratchTool,
		group: 'stateTask',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: requestApprovalTool,
		group: 'humanDecision',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
	}),
	localTool({
		tool: requestClarificationTool,
		group: 'humanDecision',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: presentPlanTool,
		group: 'humanDecision',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: requestAuthorizationTool,
		group: 'humanDecision',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
	}),
	localTool({
		tool: spawnSubagentTool,
		group: 'subagent',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: listSkillsTool,
		group: 'skill',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: loadSkillTool,
		group: 'skill',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: useSkillTool,
		group: 'skill',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: listMcpServersTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: connectMcpServerTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: refreshMcpServerTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: listMcpToolsTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: loadMcpToolTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: callMcpToolTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
	}),
	localTool({
		tool: listMcpResourcesTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: readMcpResourceTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: listMcpPromptsTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
	localTool({
		tool: loadMcpPromptTool,
		group: 'mcpConnector',
		profiles: AGENT_TOOL_STANDARD_PROFILES,
		approval: AGENT_TOOL_APPROVAL_NONE,
	}),
] as const satisfies readonly LocalToolCatalogEntry[];

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
