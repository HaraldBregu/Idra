import type { Config } from '../types';
import { addBasePrompt } from './system-add-base-prompt';
import { addWorkspacePrompt } from './system-add-workspace-prompt';

export async function buildSystemPrompt(config: Config): Promise<string> {
	let prompt = addBasePrompt('');
	prompt = await addWorkspacePrompt(config, prompt);
	return prompt;
}
