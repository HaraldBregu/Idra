/** Build the `container.skills` array for the Anthropic Messages API. */
export function toAnthropicSkills(skills) {
    return {
        skills: skills.map(({ remoteId, version }) => ({
            type: 'custom',
            skill_id: remoteId,
            version: version ?? 'latest',
        })),
    };
}
/** Build the `tools[n].environment.skills` array for the OpenAI hosted shell. */
export function toOpenAIHostedSkills(skills) {
    return skills.map(({ remoteId, version }) => ({
        type: 'skill_reference',
        skill_id: remoteId,
        ...(version !== undefined ? { version } : {}),
    }));
}
/** Build the `tools[n].environment.skills` array for the OpenAI local shell. */
export function toOpenAILocalSkills(skills) {
    return skills.map((info) => ({
        name: info.name,
        description: info.description,
        path: info.location,
    }));
}
/**
 * Resolve a list of skills into provider-specific attachment payloads.
 * Each skill carries its `SkillInfo` plus a target that names the provider
 * and any remote id required by that provider.
 */
export function resolveSkillAttachments(entries) {
    const anthropicEntries = [];
    const hostedEntries = [];
    const localEntries = [];
    for (const { info, target } of entries) {
        if (target.provider === 'anthropic') {
            anthropicEntries.push({ info, remoteId: target.remoteId, version: target.version });
        }
        else if (target.provider === 'openai-hosted') {
            hostedEntries.push({ info, remoteId: target.remoteId, version: target.version });
        }
        else {
            localEntries.push(info);
        }
    }
    const result = {};
    if (anthropicEntries.length > 0)
        result.anthropic = toAnthropicSkills(anthropicEntries);
    if (hostedEntries.length > 0)
        result.openaiHosted = toOpenAIHostedSkills(hostedEntries);
    if (localEntries.length > 0)
        result.openaiLocal = toOpenAILocalSkills(localEntries);
    return result;
}
