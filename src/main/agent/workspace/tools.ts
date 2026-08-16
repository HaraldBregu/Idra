import type { Tool } from '../types';
import { createWorkspaceEditTool } from './edit';
import { createWorkspaceReadTool } from './read';
import { createWorkspaceWriteTool } from './write';

export function workspaceTools(rootPath: string): Tool[] {
	return [
		createWorkspaceReadTool(rootPath),
		createWorkspaceWriteTool(rootPath),
		createWorkspaceEditTool(rootPath),
	];
}
