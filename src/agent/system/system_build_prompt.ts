import type { Config, Tool } from '../types';
import { addBasePrompt } from './system_add_base_prompt';
import { addFilesystemPrompt } from './system_add_filesystem_prompt';
import { addToolsPrompt } from './system_add_tools_prompt';
import { addWorkspacePrompt } from './system_add_workspace_prompt';

export async function buildSystemPrompt(
	config: Config,
	tools: Tool[] = [],
	basePrompt?: string,
	contextMode: 'minimal' | 'workspace' = 'workspace',
): Promise<string> {
	let prompt = basePrompt ?? addBasePrompt('');
	if (basePrompt === undefined) {
		prompt = addToolsPrompt(prompt, tools);
		if (contextMode === 'workspace') prompt = await addWorkspacePrompt(config, prompt);
	}
	if (contextMode === 'workspace') prompt = await addFilesystemPrompt(config, prompt);
	return prompt;
}
