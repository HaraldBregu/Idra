import type { AgentTool } from '../core/types';
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

export type LocalToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';

export type LocalToolGroup =
	| 'coreWorkspace'
	| 'stateTask'
	| 'humanDecision'
	| 'subagent'
	| 'skill'
	| 'mcpConnector';

export type LocalToolApprovalPolicy =
	| { mode: 'none' }
	| { mode: 'workspace-boundary'; target: 'write-target' | 'workdir' }
	| { mode: 'action'; actions: readonly string[] }
	| { mode: 'always' };

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

const STANDARD_PROFILES = ['coding', 'standard', 'full'] as const;
const NO_APPROVAL = { mode: 'none' } as const;
const WRITE_WORKSPACE_BOUNDARY = {
	mode: 'workspace-boundary',
	target: 'write-target',
} as const;
const ALWAYS_APPROVAL = { mode: 'always' } as const;

function localTool(definition: Omit<LocalToolCatalogEntry, 'name'>): LocalToolCatalogEntry {
	const entry = { name: definition.tool.name, ...definition };
	const ownerOnly = definition.ownerOnly ?? definition.tool.ownerOnly;
	return ownerOnly === undefined ? entry : { ...entry, ownerOnly };
}

export const LOCAL_TOOL_CATALOG = [
	localTool({
		tool: readFileTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: writeFileTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: editFileTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: listDirectoryTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: searchFilesTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: grepTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: runShellTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: ALWAYS_APPROVAL,
	}),
	localTool({
		tool: gitStatusTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: gitDiffTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: undoLastOperationTool,
		group: 'coreWorkspace',
		profiles: STANDARD_PROFILES,
		approval: ALWAYS_APPROVAL,
	}),
	localTool({
		tool: writeTodosTool,
		group: 'stateTask',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: updateTodoTool,
		group: 'stateTask',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: listTodosTool,
		group: 'stateTask',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: completeTaskTool,
		group: 'stateTask',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: writeScratchTool,
		group: 'stateTask',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: readScratchTool,
		group: 'stateTask',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: requestApprovalTool,
		group: 'humanDecision',
		profiles: STANDARD_PROFILES,
		approval: ALWAYS_APPROVAL,
	}),
	localTool({
		tool: requestClarificationTool,
		group: 'humanDecision',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: presentPlanTool,
		group: 'humanDecision',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: requestAuthorizationTool,
		group: 'humanDecision',
		profiles: STANDARD_PROFILES,
		approval: ALWAYS_APPROVAL,
	}),
	localTool({
		tool: spawnSubagentTool,
		group: 'subagent',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: listSkillsTool,
		group: 'skill',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: loadSkillTool,
		group: 'skill',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: useSkillTool,
		group: 'skill',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: listMcpServersTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: connectMcpServerTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: refreshMcpServerTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: listMcpToolsTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: loadMcpToolTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: callMcpToolTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: ALWAYS_APPROVAL,
	}),
	localTool({
		tool: listMcpResourcesTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: readMcpResourceTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: listMcpPromptsTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: loadMcpPromptTool,
		group: 'mcpConnector',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
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
