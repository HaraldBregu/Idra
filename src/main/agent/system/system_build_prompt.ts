import type { LoadedSkill } from '../context';
import type { Config, Tool } from '../types';
import { addBasePrompt } from './system_add_base_prompt';
import { addSkillPrompt } from './system_add_skill_prompt';
import { addToolsPrompt } from './system_add_tools_prompt';
import { addWorkspacePrompt } from './system_add_workspace_prompt';

export async function buildSystemPrompt(
	config: Config,
	tools: Tool[] = [],
	loadedSkills: LoadedSkill[] = [],
): Promise<string> {
	let prompt = addBasePrompt('');
	prompt = addToolsPrompt(prompt, tools);
	prompt = await addWorkspacePrompt(config, prompt);
	prompt = addSkillPrompt(prompt, loadedSkills);
	return prompt;
}
