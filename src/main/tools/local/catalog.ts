import { browserTool } from '../../browser';
import type { AgentTool } from '../core/types';
import { openBrowserTool } from './app';
import { cronTool } from './cron';
import { execTool, processTool } from './exec';
import {
	applyPatchTool,
	copyTool,
	deleteTool,
	editTool,
	findTool,
	inspectFileTool,
	moveTool,
	readTool,
	writeTool,
} from './fs';
import { taskTool } from './task';
import { webFetchTool } from './web';

export type LocalToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';

export type LocalToolGroup = 'file' | 'shell' | 'web' | 'automation' | 'browser';

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
const FULL_PROFILE = ['full'] as const;
const NO_APPROVAL = { mode: 'none' } as const;
const WRITE_WORKSPACE_BOUNDARY = {
	mode: 'workspace-boundary',
	target: 'write-target',
} as const;

function localTool(definition: Omit<LocalToolCatalogEntry, 'name'>): LocalToolCatalogEntry {
	const entry = { name: definition.tool.name, ...definition };
	const ownerOnly = definition.ownerOnly ?? definition.tool.ownerOnly;
	return ownerOnly === undefined ? entry : { ...entry, ownerOnly };
}

export const LOCAL_TOOL_CATALOG = [
	localTool({
		tool: readTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: writeTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: editTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: applyPatchTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: deleteTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: copyTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: moveTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: inspectFileTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: findTool,
		group: 'file',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: execTool,
		group: 'shell',
		profiles: STANDARD_PROFILES,
		approval: { mode: 'workspace-boundary', target: 'workdir' },
	}),
	localTool({
		tool: processTool,
		group: 'shell',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: webFetchTool,
		group: 'web',
		profiles: STANDARD_PROFILES,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: cronTool,
		group: 'automation',
		profiles: STANDARD_PROFILES,
		approval: { mode: 'action', actions: ['add', 'update', 'remove', 'run', 'wake'] },
		ownerOnly: true,
	}),
	localTool({
		tool: taskTool,
		group: 'automation',
		profiles: STANDARD_PROFILES,
		approval: { mode: 'always' },
	}),
	localTool({
		tool: openBrowserTool,
		group: 'browser',
		profiles: FULL_PROFILE,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: browserTool,
		group: 'browser',
		profiles: FULL_PROFILE,
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
