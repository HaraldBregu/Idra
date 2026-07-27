import type { LoadedSkill } from '../context';
import type { Config, Tool } from '../types';
import { addBasePrompt } from './system_add_base_prompt';
import { addFilesystemPrompt } from './system_add_filesystem_prompt';
import { addSkillPrompt } from './system_add_skill_prompt';
import { addToolsPrompt } from './system_add_tools_prompt';
import { addWorkspacePrompt } from './system_add_workspace_prompt';

export async function buildSystemPrompt(
	config: Config,
	tools: Tool[] = [],
	loadedSkills: LoadedSkill[] = [],
	activeProject?: string,
): Promise<string> {
	let prompt = addBasePrompt('');
	prompt = addToolsPrompt(prompt, tools);
	prompt = await addWorkspacePrompt(config, prompt);
	prompt = await addFilesystemPrompt(config, prompt);
	prompt = addSkillPrompt(prompt, loadedSkills);
	prompt = addProjectPrompt(prompt, activeProject);
	return prompt;
}
