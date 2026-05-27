import type { LoggerService } from '../../logger';
import type { ConnectorsService } from '../connectors';
import type { SkillsService } from '../skills';
import type { AgentTool } from '../tools';
import type { SkillDetails, SkillInfo } from '../../../shared/skills';
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
		const directAnswer = input.directAnswer && tools.length === 0;
		const promptAdditions = renderSkillPrompt(skills);

		input.streamEvent?.({
			type: 'capability_resolution_result',
			tools: input.localTools.map((tool) => tool.name),
			connectorTools: connectorTools.map((tool) => tool.name),
			skills: skills.map(({ name, reason }) => ({ name, reason })),
			directAnswer,
		});

		return {
			tools,
			connectorTools,
			skills,
			promptAdditions,
			directAnswer,
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
			const configured = new Set((input.configuredSkillNames ?? []).map(normalizeSkillName));
			const listed = await this.options.skills.list();
			const selected = listed
				.map((skill) => ({ skill, reason: skillReason(skill, input.userMessage, configured) }))
				.filter((entry): entry is { skill: SkillInfo; reason: string } => Boolean(entry.reason))
				.slice(0, MAX_SKILLS_PER_RUN);
			const loaded = await Promise.all(
				selected.map(async ({ skill, reason }) => toResolvedSkill(await this.options.skills!.load(skill.name), reason))
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

function skillReason(skill: SkillInfo, prompt: string, configured: Set<string>): string | undefined {
	if (configured.has(normalizeSkillName(skill.name))) return 'configured for this agent';
	if (matchesPrompt(prompt, [skill.name, skill.description])) return 'matched the user prompt';
	return undefined;
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

function normalizeSkillName(value: string): string {
	return value.trim().toLowerCase();
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
