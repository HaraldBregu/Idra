import type { LoggerService } from '../../logger';
import type { SkillsService } from '../../skills';
import type {
	ConnectorExecutableTool,
	ConnectorToolServicePort,
} from '../../connectors';
import { textResult, type AgentTool } from '../tools';
import type { SkillDetails } from '../../../shared/skills';
import type {
	AgentCapabilityBundle,
	AgentCapabilityResolveInput,
	AgentCapabilityServicePort,
	AgentResolvedSkill,
} from './types';

const MAX_SKILLS_PER_RUN = 3;
const MAX_SKILL_PROMPT_CHARS = 4000;

export interface AgentCapabilityServiceOptions {
	connectors?: ConnectorToolServicePort;
	skills?: SkillsService;
	logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
}

export class AgentCapabilityService implements AgentCapabilityServicePort {
	constructor(private readonly options: AgentCapabilityServiceOptions = {}) {}

	async resolveForPrompt(input: AgentCapabilityResolveInput): Promise<AgentCapabilityBundle> {
		input.streamEvent?.({ type: 'capability_resolution_start' });

		const [connectorTools, skills] = await Promise.all([
			this.resolveConnectorTools(input),
			this.resolveSkills(input),
		]);
		const tools = [...input.localTools, ...connectorTools];
		const decision = decideCapabilities({ tools, skills, bootstrapPending: input.bootstrapPending });
		const directAnswer = decision.mode === 'direct_answer';
		const promptAdditions = renderSkillPrompt(skills);

		input.streamEvent?.({
			type: 'capability_resolution_result',
			tools: input.localTools.map((tool) => tool.name),
			connectorTools: connectorTools.map((tool) => tool.name),
			skills: skills.map(({ name, reason }) => ({ name, reason })),
			directAnswer,
			decision,
		});

		return {
			tools,
			connectorTools,
			skills,
			promptAdditions,
			directAnswer,
			decision,
		};
	}

	private async resolveConnectorTools(input: AgentCapabilityResolveInput): Promise<AgentTool[]> {
		const connectors = this.options.connectors;
		if (!connectors || (!input.shouldUseTools && !input.bootstrapPending)) return [];
		try {
			await this.refreshMissingConnectorTools(connectors);
			return connectors
				.searchTools({ query: input.userMessage, limit: 8 })
				.map((tool) => connectorAgentTool(tool, connectors));
		} catch (error) {
			this.options.logger?.warn('AgentCapabilityService', 'Failed to resolve connector tools', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	private async refreshMissingConnectorTools(connectors: ConnectorToolServicePort): Promise<void> {
		const missingTools = connectors.list().filter((connector) =>
			connector.enabled !== false &&
			connector.status === 'configured' &&
			connector.id &&
			(connector.toolsCount ?? connector.tools.length) === 0
		);
		await Promise.all(missingTools.map(async (connector) => {
			try {
				await connectors.refreshTools(connector.id!);
			} catch (error) {
				this.options.logger?.warn('AgentCapabilityService', 'Failed to refresh connector tools', {
					connectorId: connector.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}));
	}

	private async resolveSkills(input: AgentCapabilityResolveInput): Promise<AgentResolvedSkill[]> {
		if (!this.options.skills) return [];
		try {
			const selected = await this.options.skills.search(input.userMessage, {
				names: input.configuredSkillNames,
				limit: MAX_SKILLS_PER_RUN,
			});
			const loaded = await Promise.all(
				selected.map(async (skill) => toResolvedSkill(await this.options.skills!.load(skill.name), skill.reason))
			);
			return loaded;
		} catch (error) {
			this.options.logger?.warn('AgentCapabilityService', 'Failed to resolve skills', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}
}

function connectorAgentTool(
	tool: ConnectorExecutableTool,
	connectors: ConnectorToolServicePort
): AgentTool {
	return {
		name: tool.name,
		displayName: tool.displayName,
		description: tool.description,
		schema: connectorToolSchema(tool),
		serviceKind: 'connector',
		serviceId: tool.connectorId,
		needsApproval: tool.permission === 'needs-approval' ? () => true : false,
		execute: async (args: unknown) => {
			try {
				const payload = await connectors.execTool({
					connectorId: tool.connectorId,
					toolName: tool.toolName,
					args: readConnectorToolArgs(args),
				});
				return textResult(JSON.stringify(payload, null, 2));
			} catch (error) {
				return textResult(error instanceof Error ? error.message : String(error), true);
			}
		},
	};
}

function connectorToolSchema(tool: ConnectorExecutableTool): AgentTool['schema'] {
	return tool.inputSchema && typeof tool.inputSchema === 'object'
		? tool.inputSchema as AgentTool['schema']
		: { type: 'object', properties: {}, additionalProperties: true };
}

function readConnectorToolArgs(args: unknown): Record<string, unknown> {
	if (args === undefined || args === null) return {};
	if (typeof args !== 'object' || Array.isArray(args)) {
		throw new Error('Connector tool arguments must be an object.');
	}
	return args as Record<string, unknown>;
}

function toResolvedSkill(skill: SkillDetails, reason: string): AgentResolvedSkill {
	return {
		name: skill.name,
		reason,
		prompt: trimPrompt(skill.instructions),
	};
}

function decideCapabilities(input: {
	tools: readonly AgentTool[];
	skills: readonly AgentResolvedSkill[];
	bootstrapPending: boolean;
}): AgentCapabilityBundle['decision'] {
	const hasTools = input.tools.length > 0;
	const hasSkills = input.skills.length > 0;
	if (hasTools && hasSkills) {
		return { mode: 'use_tools_and_skills', reason: 'matched both tool and skill capabilities' };
	}
	if (hasTools) return { mode: 'use_tools', reason: 'matched available tools' };
	if (hasSkills) return { mode: 'use_skills', reason: 'matched available skills' };
	return {
		mode: 'direct_answer',
		reason: input.bootstrapPending
			? 'no matching tools or skills; continue bootstrap without extra capabilities'
			: 'no matching tools or skills',
	};
}

function trimPrompt(value: string): string {
	const trimmed = value.trim();
	return trimmed.length <= MAX_SKILL_PROMPT_CHARS
		? trimmed
		: `${trimmed.slice(0, MAX_SKILL_PROMPT_CHARS)}\n[skill instructions truncated]`;
}

function renderSkillPrompt(skills: AgentResolvedSkill[]): string {
	if (skills.length === 0) return '';
	return [
		'Selected skills for this run:',
		...skills.map((skill) =>
			[
				`Skill: ${skill.name}`,
				`Reason: ${skill.reason}`,
				'Instructions:',
				skill.prompt,
			].join('\n')
		),
	].join('\n\n');
}
