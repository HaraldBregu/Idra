import type { LoggerService } from '../observability';
import type { SkillsService } from '../skills';
import { decideCapabilities, renderSkillPrompt, toResolvedSkill } from './selection';
import type {
	AgentCapabilityBundle,
	AgentCapabilityResolveInput,
	AgentCapabilityServicePort,
	AgentResolvedSkill,
} from './types';

const MAX_SKILLS_PER_RUN = 3;

export interface AgentCapabilityServiceOptions {
	skills?: SkillsService;
	logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
}

export class AgentCapabilityService implements AgentCapabilityServicePort {
	constructor(private readonly options: AgentCapabilityServiceOptions = {}) {}

	async resolveForPrompt(input: AgentCapabilityResolveInput): Promise<AgentCapabilityBundle> {
		input.streamEvent?.({ type: 'capability_resolution_start' });

		const skills = await this.resolveSkills(input);
		const tools = [...input.localTools];
		const decision = decideCapabilities({
			tools,
			skills,
			bootstrapPending: input.bootstrapPending,
		});
		const directAnswer = decision.mode === 'direct_answer';
		const promptAdditions = renderSkillPrompt(skills);

		input.streamEvent?.({
			type: 'capability_resolution_result',
			tools: input.localTools.map((tool) => tool.name),
			services: tools.map((tool) => ({
				name: tool.name,
				displayName: tool.displayName,
				serviceKind: tool.serviceKind ?? 'tool',
				serviceId: tool.serviceId,
			})),
			skills: skills.map(({ name, reason }) => ({ name, reason })),
			directAnswer,
			decision,
		});

		return {
			tools,
			skills,
			promptAdditions,
			directAnswer,
			decision,
		};
	}

	private async resolveSkills(input: AgentCapabilityResolveInput): Promise<AgentResolvedSkill[]> {
		if (!this.options.skills) return [];
		try {
			const selected = await this.options.skills.search(input.userMessage, {
				names: input.configuredSkillNames,
				limit: MAX_SKILLS_PER_RUN,
			});
			const loaded = await Promise.all(
				selected.map(async (skill) =>
					toResolvedSkill(await this.options.skills!.load(skill.name), skill.reason)
				)
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
