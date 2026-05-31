import type { AgentTool } from '../core/types';
import { filesystemListTool } from '../files/tools';
import { toolDescription } from '../metadata';

type ListDirectoryArgs = Parameters<typeof filesystemListTool.execute>[0];

export const listDirectoryTool: AgentTool<ListDirectoryArgs> = {
	...filesystemListTool,
	name: 'list_directory',
	description: toolDescription('list_directory'),
};
