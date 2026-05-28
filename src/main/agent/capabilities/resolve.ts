import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ConnectorsService, ConnectorExecutableTool } from '../../connectors';
import type { SkillsService } from '../../skills';
import type { SkillDetails } from '../../../shared/skills';
import type { AgentCapabilityResolutionSummary, AgentSelectedSkillSummary } from '../../../shared/agents/capabilities';
import type { AgentTool } from './local';
import { jsonResult, textResult } from './local';

export interface ResolvedAgentCapabilities {
	tools: AgentTool[];
	selectedSkills: SkillDetails[];
	connectorStatuses: Array<{ connectorId: string; status: 'ready' | 'refreshed' | 'unavailable'; message?: string }>;
	summary: AgentCapabilityResolutionSummary;
}

export async function resolveAgentCapabilities(input: {
	message: string;
	localTools: AgentTool[];
	connectors?: Pick<ConnectorsService, 'list' | 'refreshTools' | 'searchTools' | 'execTool'>;
	skills?: Pick<SkillsService, 'search' | 'load'>;
	configuredSkillNames?: readonly string[];
	toolsAllow?: readonly string[];
	toolsDeny?: readonly string[];
}): Promise<ResolvedAgentCapabilities> {
	const selectedSkills = await resolveSkills(input.skills, input.message, input.configuredSkillNames);
	const connectorResult = await resolveConnectorTools(input.connectors, input.message);
	const tools = filterTools([...input.localTools, ...connectorResult.tools], input.toolsAllow, input.toolsDeny);
	const connectorNames = connectorResult.tools.map((tool) => tool.name);
	const skillSummaries = selectedSkills.map((skill): AgentSelectedSkillSummary => ({
		name: skill.name,
		reason: input.configuredSkillNames?.includes(skill.name) ? 'configured for this agent' : 'matched the user request',
	}));
	const toolNames = tools.filter((tool) => tool.serviceKind !== 'connector').map((tool) => tool.name);
	return {
		tools,
		selectedSkills,
		connectorStatuses: connectorResult.statuses,
		summary: {
			tools: toolNames,
			connectorTools: connectorNames.filter((name) => tools.some((tool) => tool.name === name)),
			skills: skillSummaries,
			directAnswer: tools.length === 0 && selectedSkills.length === 0,
			decision: {
				mode: tools.length && selectedSkills.length ? 'use_tools_and_skills' : tools.length ? 'use_tools' : selectedSkills.length ? 'use_skills' : 'direct_answer',
				reason: 'Selected the smallest available context for this turn.',
			},
		},
	};
}

async function resolveSkills(
	skills: Pick<SkillsService, 'search' | 'load'> | undefined,
	message: string,
	configuredSkillNames: readonly string[] | undefined
): Promise<SkillDetails[]> {
	if (!skills) return [];
	const names = new Set(configuredSkillNames ?? []);
	if (!configuredSkillNames?.length) {
		for (const match of await skills.search(message, { limit: 3 }).catch(() => [])) names.add(match.name);
	}
	const loaded = await Promise.all([...names].map((name) => skills.load(name).then(loadSkillReferences).catch(() => undefined)));
	return loaded.filter((skill): skill is SkillDetails => Boolean(skill?.instructions.trim()));
}

async function resolveConnectorTools(
	connectors: Pick<ConnectorsService, 'list' | 'refreshTools' | 'searchTools' | 'execTool'> | undefined,
	message: string
): Promise<{ tools: AgentTool[]; statuses: Array<{ connectorId: string; status: 'ready' | 'refreshed' | 'unavailable'; message?: string }> }> {
	if (!connectors) return { tools: [], statuses: [] };
	const statuses: Array<{ connectorId: string; status: 'ready' | 'refreshed' | 'unavailable'; message?: string }> = [];
	for (const connector of connectors.list()) {
		const id = connector.id ?? connector.connectorId;
		if (!id || connector.enabled === false) continue;
		if (!connector.hasTools || connector.status === 'error') {
			try {
				await connectors.refreshTools(id);
				statuses.push({ connectorId: id, status: 'refreshed' });
			} catch (error) {
				statuses.push({ connectorId: id, status: 'unavailable', message: error instanceof Error ? error.message : String(error) });
			}
		} else {
			statuses.push({ connectorId: id, status: 'ready' });
		}
	}
	return { tools: connectors.searchTools({ query: message, limit: 8 }).map((tool) => connectorToolToAgentTool(tool, connectors)), statuses };
}

function connectorToolToAgentTool(tool: ConnectorExecutableTool, connectors: Pick<ConnectorsService, 'execTool'>): AgentTool {
	return {
		name: tool.name,
		displayName: tool.displayName,
		description: tool.description,
		schema: tool.inputSchema ?? { type: 'object', properties: {}, additionalProperties: true },
		serviceKind: 'connector',
		serviceId: tool.connectorId,
		needsApproval: tool.requiresApproval,
		async execute(args) {
			if (tool.permission === 'blocked') return textResult(`Connector tool is blocked: ${tool.displayName}`, true);
			const result = await connectors.execTool({ connectorId: tool.connectorId, toolName: tool.toolName, args });
			return typeof result === 'string' ? textResult(result) : jsonResult(result);
		},
	};
}

async function loadSkillReferences(skill: SkillDetails): Promise<SkillDetails> {
	const references = skill.supportFiles.filter((file) => file.kind === 'reference').slice(0, 3);
	if (references.length === 0) return skill;
	const chunks = await Promise.all(references.map(async (file) => {
		const target = path.resolve(skill.location, file.relativePath);
		if (!target.startsWith(path.resolve(skill.location))) return '';
		const content = await fs.readFile(target, 'utf8').catch(() => '');
		return content ? `\n\n### ${file.relativePath}\n${content.slice(0, 8000)}` : '';
	}));
	return { ...skill, instructions: `${skill.instructions}${chunks.join('')}` };
}

function filterTools(tools: AgentTool[], allow: readonly string[] | undefined, deny: readonly string[] | undefined): AgentTool[] {
	const denied = new Set(deny ?? []);
	const allowed = allow?.length ? new Set(allow) : undefined;
	return tools.filter((tool) =>
		!denied.has(tool.name) &&
		(!allowed || allowed.has(tool.name) || allow?.some((entry) => entry.startsWith('group:') && tool.serviceKind !== 'connector'))
	);
}
