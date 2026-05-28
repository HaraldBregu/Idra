import type { WorkspaceContextFile } from './startup';
import type { AgentTool } from '../capabilities/local';
import { providerSafeToolName } from '../capabilities/local/tool-definition-adapter';
import { assistant } from '../../../shared/agents/assistant';
import type { SkillDetails } from '../../../shared/skills';

export function buildSystemPrompt(input: { base?: string; startupFiles?: WorkspaceContextFile[]; bootstrapPending?: boolean; skills?: SkillDetails[]; tools?: AgentTool[] } = {}): string {
	return [
		input.base ?? `You are ${assistant.name}. ${assistant.description}`,
		input.bootstrapPending ? [
			'## Bootstrap',
			'BOOTSTRAP.md is pending for this agent workspace.',
			'Follow the first-run ritual in BOOTSTRAP.md: start with a brief presentation of who you are, then learn who you are and who the user is one question at a time.',
			'When the identity, user, and SOUL.md details are clear, use `startup_files` to update IDENTITY.md, USER.md, and SOUL.md, then complete the bootstrap.',
		].join('\n') : '',
		...(input.startupFiles ?? []).flatMap((file) => !file.missing && file.content ? [`# ${file.name}\n${file.content}`] : []),
		input.skills?.length ? `## Skills\n${input.skills.map((skill) => `### ${skill.name}\n${skill.instructions}`).join('\n\n')}` : '',
		input.tools?.length ? `## Tools\n${input.tools.map((tool) => `- **${providerSafeToolName(tool.name)}**: ${tool.description}`).join('\n')}` : 'No tools are available for this turn.',
	].filter(Boolean).join('\n\n');
}
