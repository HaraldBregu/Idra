import type { AgentTool } from '../core/types';
import { toolDescription } from '../metadata';
import { editTool } from './edit';

type EditFileArgs = Parameters<typeof editTool.execute>[0];

export const editFileTool: AgentTool<EditFileArgs> = {
	...editTool,
	name: 'edit_file',
	description: toolDescription('edit_file'),
};
