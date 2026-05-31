import type { AgentTool } from '../core/types';
import { editTool } from '../files/tools';
import { toolDescription } from '../metadata';

type EditFileArgs = Parameters<typeof editTool.execute>[0];

export const editFileTool: AgentTool<EditFileArgs> = {
	...editTool,
	name: 'edit_file',
	description: toolDescription('edit_file'),
};
