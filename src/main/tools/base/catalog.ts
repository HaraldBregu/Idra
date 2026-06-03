import {
	AGENT_TOOL_METADATA_BY_NAME,
	AGENT_TOOL_NAMES,
	type AgentToolApprovalPolicy,
	type AgentToolGroupName,
	type AgentToolName,
	type AgentToolProfile,
} from '../../../shared/tools';
import { requestedTools } from '../requested/tools';
import type { ToolProfile, ToolPolicyServicePort, ToolPolicySubject } from '../shared/tool-types';
import { ToolPolicyService } from '../shared/tool-types';
import { normalizeToolName } from './common';
import type { AgentTool } from './tool';

export type LocalToolProfile = AgentToolProfile;
export type LocalToolGroup = AgentToolGroupName;
export type LocalToolApprovalPolicy = AgentToolApprovalPolicy;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocalToolImplementation = AgentTool<any, any>;

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

const REQUESTED_TOOL_BY_NAME = new Map(requestedTools.map((tool) => [tool.name, tool]));

export const LOCAL_TOOL_CATALOG = AGENT_TOOL_NAMES.map((name) => {
	const tool = REQUESTED_TOOL_BY_NAME.get(name);
	if (!tool) throw new Error(`requested tool is missing an implementation: ${name}`);
	return localTool(name, tool);
}) as readonly LocalToolCatalogEntry[];

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRELOADED_LOCAL_TOOLS: AgentTool<any, any>[] = LOCAL_TOOL_CATALOG.map(
	(entry) => entry.tool
);

export const ALL_TOOLS = PRELOADED_LOCAL_TOOLS;

export interface ToolRegistryConfig {
	profile: ToolProfile;
	allow: string[];
	alsoAllow?: string[];
	deny: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
}

const defaultToolPolicyService = new ToolPolicyService();

export function createTools(
	cfg: ToolRegistryConfig,
	policy: Pick<ToolPolicyServicePort, 'evaluateTools'> = defaultToolPolicyService
): AgentTool[] {
	const tools = PRELOADED_LOCAL_TOOLS as unknown as AgentTool[];
	const catalog = localToolCatalogByName();
	const subjects: ToolPolicySubject[] = tools.map((tool) => {
		const entry = catalog.get(tool.name);
		return {
			name: tool.name,
			ownerOnly: entry?.ownerOnly,
			groups: entry ? [`group:${entry.group}`] : undefined,
		};
	});
	const result = policy.evaluateTools(subjects, {
		stages: {
			profile: { profile: cfg.profile, alsoAllow: cfg.alsoAllow },
			runtime: {
				allow: cfg.allow.length > 0 ? cfg.allow : undefined,
				deny: cfg.deny,
			},
		},
	});
	return tools.filter((tool) => result.allowed.has(normalizeToolName(tool.name)));
}
