import type { SkillInfo } from './types';
export interface AnthropicSkillEntry {
    type: 'anthropic' | 'custom';
    skill_id: string;
    version?: string;
}
export interface AnthropicSkillContainer {
    skills: AnthropicSkillEntry[];
}
/** Build the `container.skills` array for the Anthropic Messages API. */
export declare function toAnthropicSkills(skills: ReadonlyArray<{
    info: SkillInfo;
    remoteId: string;
    version?: string;
}>): AnthropicSkillContainer;
export interface OpenAIHostedSkillEntry {
    type: 'skill_reference';
    skill_id: string;
    version?: number | 'latest';
}
/** Build the `tools[n].environment.skills` array for the OpenAI hosted shell. */
export declare function toOpenAIHostedSkills(skills: ReadonlyArray<{
    info: SkillInfo;
    remoteId: string;
    version?: number | 'latest';
}>): OpenAIHostedSkillEntry[];
export interface OpenAILocalSkillEntry {
    name: string;
    description: string;
    path: string;
}
/** Build the `tools[n].environment.skills` array for the OpenAI local shell. */
export declare function toOpenAILocalSkills(skills: ReadonlyArray<SkillInfo>): OpenAILocalSkillEntry[];
export type SkillAdapterTarget = {
    provider: 'anthropic';
    remoteId: string;
    version?: string;
} | {
    provider: 'openai-hosted';
    remoteId: string;
    version?: number | 'latest';
} | {
    provider: 'openai-local';
};
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
export declare function resolveSkillAttachments(entries: ReadonlyArray<{
    info: SkillInfo;
    target: SkillAdapterTarget;
}>): ResolvedSkillAttachment;
