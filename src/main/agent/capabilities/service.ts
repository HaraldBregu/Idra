import type { LoggerService } from '../../logger';
import type { ConnectorsService } from '../../connectors';
import type { SkillsService } from '../../skills';
import type { AgentTool } from '../tools';
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
	connectors?: ConnectorsService;
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
		if (!this.options.connectors || (!input.shouldUseTools && !input.bootstrapPending)) return [];
		try {
			const tools = this.options.connectors.createAgentTools().map((tool) => ({
				...tool,
				serviceKind: 'connector' as const,
			}));
			return tools.filter((tool) => matchesPrompt(input.userMessage, [tool.name, tool.description]));
		} catch (error) {
			this.options.logger?.warn('AgentCapabilityService', 'Failed to resolve connector tools', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
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

function matchesPrompt(prompt: string, values: string[]): boolean {
	const normalizedPrompt = normalizeForMatch(prompt);
	if (!normalizedPrompt) return false;
	return values.some((value) => {
		const words = normalizeForMatch(value)
			.split(' ')
			.filter((word) => word.length >= 4);
		return words.some((word) => normalizedPrompt.includes(word));
	});
}

function normalizeForMatch(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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
