import { findProject } from '../projects/projects_find';
import { readInstructions } from '../projects/projects_instructions';
import { list } from '../projects/projects_list';

const inline = (text: string): string => text.replace(/\s+/g, ' ').trim();

export function addProjectPrompt(prompt: string, activeProject?: string): string {
	const projects = list();
	prompt += '\n\n# Projects';
	prompt +=
		'\n\nProjects are named workspaces you share with the user; each has its own AGENTS.md instructions. When the user talks about projects, use the project tools: create_project, list_projects, select_project, update_project, delete_project, and unload_project. Answer questions about available projects from the list below without loading anything. Selecting a project adds its instructions to this prompt for the current session only; follow the active project instructions until it is unloaded or the session ends.';
	prompt += projects.length === 0 ? '\n\nNo projects exist yet.' : '\n\nAvailable projects:';
	for (const project of projects)
		prompt += `\n- ${inline(project.title)}: ${inline(project.description)}`;
	const active = activeProject ? findProject(activeProject) : undefined;
	if (active)
		prompt += `\n\n## Active project: ${inline(active.title)}\n${readInstructions(active)}`;
	return prompt;
}
