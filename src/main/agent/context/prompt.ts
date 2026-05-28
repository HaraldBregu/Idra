import type { WorkspaceContextFile } from './startup';
import type { AgentTool } from '../capabilities/local';
import { assistant } from '../../../shared/agents/assistant';

export function buildSystemPrompt(input: { base?: string; startupFiles?: WorkspaceContextFile[]; tools?: AgentTool[] } = {}): string {
	return [
		input.base ?? `You are ${assistant.name}. ${assistant.description}`,
		...(input.startupFiles ?? []).flatMap((file) => !file.missing && file.content ? [`# ${file.name}\n${file.content}`] : []),
		input.tools?.length ? `Available tools: ${input.tools.map((tool) => tool.name).join(', ')}` : '',
	].filter(Boolean).join('\n\n');
}
