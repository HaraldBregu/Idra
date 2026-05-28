import type { WorkspaceContextFile } from './startup';
import type { AgentTool } from '../capabilities/local';
import { providerSafeToolName } from '../capabilities/local/tool-definition-adapter';
import { assistant } from '../../../shared/agents/assistant';
import type { SkillDetails } from '../../../shared/skills';

export function buildSystemPrompt(input: { base?: string; startupFiles?: WorkspaceContextFile[]; skills?: SkillDetails[]; tools?: AgentTool[] } = {}): string {
	return [
		input.base ?? `You are ${assistant.name}. ${assistant.description}`,
		...(input.startupFiles ?? []).flatMap((file) => !file.missing && file.content ? [`# ${file.name}\n${file.content}`] : []),
		input.skills?.length ? `## Skills\n${input.skills.map((skill) => `### ${skill.name}\n${skill.instructions}`).join('\n\n')}` : '',
		input.tools?.length ? `## Tools\n${input.tools.map((tool) => `- **${providerSafeToolName(tool.name)}**: ${tool.description}`).join('\n')}` : 'No tools are available for this turn.',
	].filter(Boolean).join('\n\n');
}
