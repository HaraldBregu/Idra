import type { SkillDetails } from '../../../shared/skills';
import type { AgentTool } from '../tools';
import type { AgentCapabilityBundle, AgentResolvedSkill } from './types';

const MAX_SKILL_PROMPT_CHARS = 4000;

export function toResolvedSkill(skill: SkillDetails, reason: string): AgentResolvedSkill {
	return {
		name: skill.name,
		reason,
		prompt: trimPrompt(skill.instructions),
	};
}

export function decideCapabilities(input: {
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

export function matchesPrompt(prompt: string, values: string[]): boolean {
	const normalizedPrompt = normalizeForMatch(prompt);
	if (!normalizedPrompt) return false;
	return values.some((value) => {
		const words = normalizeForMatch(value)
			.split(' ')
			.filter((word) => word.length >= 4);
		return words.some((word) => normalizedPrompt.includes(word));
	});
}

export function renderSkillPrompt(skills: AgentResolvedSkill[]): string {
	if (skills.length === 0) return '';
	return [
		'Selected skills for this run:',
		...skills.map((skill) =>
			[`Skill: ${skill.name}`, `Reason: ${skill.reason}`, 'Instructions:', skill.prompt].join('\n')
		),
	].join('\n\n');
}

function normalizeForMatch(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function trimPrompt(value: string): string {
	const trimmed = value.trim();
	return trimmed.length <= MAX_SKILL_PROMPT_CHARS
		? trimmed
		: `${trimmed.slice(0, MAX_SKILL_PROMPT_CHARS)}\n[skill instructions truncated]`;
}
