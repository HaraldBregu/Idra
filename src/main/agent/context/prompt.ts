import type { WorkspaceContextFile } from './startup';
import type { AgentTool } from '../capabilities/local';

export function buildSystemPrompt(input: { base?: string; startupFiles?: WorkspaceContextFile[]; tools?: AgentTool[] } = {}): string {
	return [
		input.base ?? 'You are Friday, a general-purpose personal assistant agent.',
		...(input.startupFiles ?? []).flatMap((file) => !file.missing && file.content ? [`# ${file.name}\n${file.content}`] : []),
		input.tools?.length ? `Available tools: ${input.tools.map((tool) => tool.name).join(', ')}` : '',
	].filter(Boolean).join('\n\n');
}
