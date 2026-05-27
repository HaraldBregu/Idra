import type { AgentTool } from '../core/types';
import {
	cronCreateTool,
	cronDeleteTool,
	cronListTool,
	cronReadTool,
	cronRunTool,
	cronStartTool,
	cronStopTool,
	cronUpdateTool,
} from '../cron/tools';
import {
	applyPatchTool,
	copyTool,
	deleteTool,
	editTool,
	findTool,
	filesystemCopyTool,
	filesystemCreateTool,
	filesystemDeleteTool,
	filesystemListTool,
	filesystemMoveTool,
	filesystemReadTool,
	filesystemSearchTool,
	filesystemUpdateTool,
	inspectFileTool,
	moveTool,
	readTool,
	writeTool,
} from '../files/tools';
import { scriptRunTool } from '../scripts/tools';

export type LocalToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';

export type LocalToolGroup = 'file' | 'filesystem' | 'cron' | 'script';

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
		tool: filesystemCreateTool,
		group: 'filesystem',
		profiles: FULL_PROFILE,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: filesystemReadTool,
		group: 'filesystem',
		profiles: FULL_PROFILE,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: filesystemUpdateTool,
		group: 'filesystem',
		profiles: FULL_PROFILE,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: filesystemDeleteTool,
		group: 'filesystem',
		profiles: FULL_PROFILE,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: filesystemListTool,
		group: 'filesystem',
		profiles: FULL_PROFILE,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: filesystemMoveTool,
		group: 'filesystem',
		profiles: FULL_PROFILE,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
	localTool({
		tool: filesystemCopyTool,
		group: 'filesystem',
		profiles: FULL_PROFILE,
		approval: WRITE_WORKSPACE_BOUNDARY,
	}),
localTool({
	tool: filesystemSearchTool,
	group: 'filesystem',
	profiles: FULL_PROFILE,
	approval: NO_APPROVAL,
}),
localTool({
	tool: scriptRunTool,
	group: 'script',
	profiles: STANDARD_PROFILES,
	approval: WRITE_WORKSPACE_BOUNDARY,
}),
localTool({
	tool: cronCreateTool,
		group: 'cron',
		profiles: FULL_PROFILE,
		approval: { mode: 'always' },
	}),
	localTool({
		tool: cronReadTool,
		group: 'cron',
		profiles: FULL_PROFILE,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: cronUpdateTool,
		group: 'cron',
		profiles: FULL_PROFILE,
		approval: { mode: 'always' },
	}),
	localTool({
		tool: cronDeleteTool,
		group: 'cron',
		profiles: FULL_PROFILE,
		approval: { mode: 'always' },
	}),
	localTool({
		tool: cronListTool,
		group: 'cron',
		profiles: FULL_PROFILE,
		approval: NO_APPROVAL,
	}),
	localTool({
		tool: cronStartTool,
		group: 'cron',
		profiles: FULL_PROFILE,
		approval: { mode: 'always' },
	}),
	localTool({
		tool: cronStopTool,
		group: 'cron',
		profiles: FULL_PROFILE,
		approval: { mode: 'always' },
	}),
	localTool({
		tool: cronRunTool,
		group: 'cron',
		profiles: FULL_PROFILE,
		approval: { mode: 'always' },
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
