import type { SkillInfo } from './skills';

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

export interface AnthropicSkillEntry {
	type: 'anthropic' | 'custom';
	skill_id: string;
	version?: string;
}

export interface AnthropicSkillContainer {
	skills: AnthropicSkillEntry[];
}

/** Build the `container.skills` array for the Anthropic Messages API. */
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

// ---------------------------------------------------------------------------
// OpenAI – hosted shell
// ---------------------------------------------------------------------------

export interface OpenAIHostedSkillEntry {
	type: 'skill_reference';
	skill_id: string;
	version?: number | 'latest';
}

/** Build the `tools[n].environment.skills` array for the OpenAI hosted shell. */
export function toOpenAIHostedSkills(
	skills: ReadonlyArray<{ info: SkillInfo; remoteId: string; version?: number | 'latest' }>
): OpenAIHostedSkillEntry[] {
	return skills.map(({ remoteId, version }) => ({
		type: 'skill_reference',
		skill_id: remoteId,
		...(version !== undefined ? { version } : {}),
	}));
}

// ---------------------------------------------------------------------------
// OpenAI – local shell
// ---------------------------------------------------------------------------

export interface OpenAILocalSkillEntry {
	name: string;
	description: string;
	path: string;
}

/** Build the `tools[n].environment.skills` array for the OpenAI local shell. */
export function toOpenAILocalSkills(skills: ReadonlyArray<SkillInfo>): OpenAILocalSkillEntry[] {
	return skills.map((info) => ({
		name: info.name,
		description: info.description,
		path: info.location,
	}));
}

// ---------------------------------------------------------------------------
// Provider-agnostic helper
// ---------------------------------------------------------------------------

export type SkillAdapterTarget =
	| { provider: 'anthropic'; remoteId: string; version?: string }
	| { provider: 'openai-hosted'; remoteId: string; version?: number | 'latest' }
	| { provider: 'openai-local' };

export interface ResolvedSkillAttachment {
	anthropic?: AnthropicSkillContainer;
	openaiHosted?: OpenAIHostedSkillEntry[];
	openaiLocal?: OpenAILocalSkillEntry[];
}

/**
 * Resolve a list of skills into provider-specific attachment payloads.
 * Each skill carries its `SkillInfo` plus a target that names the provider
 * and any remote id required by that provider.
 */
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
