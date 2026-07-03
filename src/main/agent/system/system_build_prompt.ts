import type { Config } from '../types';
import { addBasePrompt } from './system_add_base_prompt';
import { addSkillPrompt } from './system_add_skill_prompt';
import { addWorkspacePrompt } from './system_add_workspace_prompt';

export async function buildSystemPrompt(config: Config): Promise<string> {
	let prompt = addBasePrompt('');
	prompt = await addWorkspacePrompt(config, prompt);
	prompt = addSkillPrompt(prompt);
	return prompt;
}
