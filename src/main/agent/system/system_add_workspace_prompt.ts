import type { Config } from '../types';
import { hasUserProfile } from './system_has_user_profile';
import { readAgent } from './system_read_agent';
import { readBootstrap } from './system_read_bootstrap';
import { readIdentity } from './system_read_identity';
import { readMemory } from './system_read_memory';
import { readSoul } from './system_read_soul';
import { readUser } from './system_read_user';
import { workspacePath } from './system_workspace_path';

export async function addWorkspacePrompt(config: Config, prompt: string): Promise<string> {
	const resolvedWorkspacePath = workspacePath(config);

	prompt += '\n\n## Workspace';
	prompt += `\nYour workspace directory holds your configuration and bootstrap files: ${resolvedWorkspacePath}`;
	prompt += '\nIt is not your working directory for tasks, use it only to read or update your configuration and bootstrap files.';

	let workspaceContext = '';
	const agentText = await readAgent(resolvedWorkspacePath);
	const identityText = await readIdentity(resolvedWorkspacePath);
	const soulText = await readSoul(resolvedWorkspacePath);
	const userText = await readUser(resolvedWorkspacePath);
	const memoryText = await readMemory(resolvedWorkspacePath);

	const bootstrapText = hasUserProfile(userText)
		? ''
		: await readBootstrap(resolvedWorkspacePath);
	if (agentText.trim())
		workspaceContext += `\n\n${agentText.trim()}`;
	if (bootstrapText.trim())
		workspaceContext += `\n\n${bootstrapText.trim()}`;
	if (identityText.trim())
		workspaceContext += `\n\n${identityText.trim()}`;
	if (soulText.trim())
		workspaceContext += `\n\n${soulText.trim()}`;
	if (userText.trim())
		workspaceContext += `\n\n${userText.trim()}`;
	if (memoryText.trim())
		workspaceContext += `\n\n${memoryText.trim()}`;

	if (workspaceContext)
		prompt += workspaceContext;

	return prompt;
}
