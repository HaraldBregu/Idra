import type {
	AnthropicSkillContainer,
	OpenAIHostedSkillEntry,
	OpenAILocalSkillEntry,
	ResolvedSkillAttachment,
	SkillAdapterTarget,
	SkillInfo,
} from './skills.types';

export const SKILL_CATEGORIES = [
	'communication',
	'research',
	'coding',
	'planning',
	'analytics',
	'productivity',
	'content',
	'workflow',
	'automation',
	'support',
	'retrieval',
	'reasoning',
	'creative',
	'operations',
	'developerTools',
] as const;

export function toAnthropicSkills(
	skills: ReadonlyArray<{ info: SkillInfo; remoteId: string; version?: string }>
): AnthropicSkillContainer {
	return {
		skills: skills.map(({ remoteId, version }) => ({
			type: 'custom',
			skill_id: remoteId,
			version: version ?? 'latest',
		})),
	};
}

export function toOpenAIHostedSkills(
	skills: ReadonlyArray<{ info: SkillInfo; remoteId: string; version?: number | 'latest' }>
): OpenAIHostedSkillEntry[] {
	return skills.map(({ remoteId, version }) => ({
		type: 'skill_reference',
		skill_id: remoteId,
		...(version !== undefined ? { version } : {}),
	}));
}

export function toOpenAILocalSkills(skills: ReadonlyArray<SkillInfo>): OpenAILocalSkillEntry[] {
	return skills.map((info) => ({
		name: info.name,
		description: info.description,
		path: info.location,
	}));
}

export function resolveSkillAttachments(
	entries: ReadonlyArray<{ info: SkillInfo; target: SkillAdapterTarget }>
): ResolvedSkillAttachment {
	const anthropicEntries: { info: SkillInfo; remoteId: string; version?: string }[] = [];
	const hostedEntries: {
		info: SkillInfo;
		remoteId: string;
		version?: number | 'latest';
	}[] = [];
	const localEntries: SkillInfo[] = [];

	for (const { info, target } of entries) {
		if (target.provider === 'anthropic') {
			anthropicEntries.push({ info, remoteId: target.remoteId, version: target.version });
		} else if (target.provider === 'openai-hosted') {
			hostedEntries.push({ info, remoteId: target.remoteId, version: target.version });
		} else {
			localEntries.push(info);
		}
	}

	const result: ResolvedSkillAttachment = {};
	if (anthropicEntries.length > 0) result.anthropic = toAnthropicSkills(anthropicEntries);
	if (hostedEntries.length > 0) result.openaiHosted = toOpenAIHostedSkills(hostedEntries);
	if (localEntries.length > 0) result.openaiLocal = toOpenAILocalSkills(localEntries);
	return result;
}
