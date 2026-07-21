import { list, selectedProject } from '../projects';

export function addProjectPrompt(prompt: string): string {
	const projects = list();
	prompt += '\n\n# Projects';
	prompt +=
		'\n\nProjects are named workspaces you share with the user; each has its own AGENTS.md instructions. When the user talks about projects, use the project tools: create_project, list_projects, select_project, update_project, delete_project, and unload_project. Answer questions about available projects from the list below without loading anything. Selecting a project adds its instructions to this prompt; follow the active project instructions until it is unloaded.';
	prompt += projects.length === 0 ? '\n\nNo projects exist yet.' : '\n\nAvailable projects:';
	for (const project of projects) prompt += `\n- ${project.title}: ${project.description}`;
	const selected = selectedProject();
	if (selected)
		prompt += `\n\n## Active project: ${selected.project.title}\n${selected.instructions}`;
	return prompt;
}
