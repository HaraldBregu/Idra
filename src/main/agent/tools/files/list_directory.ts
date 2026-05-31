import type { AgentTool } from '../core/types';
import { toolDescription } from '../metadata';
import { filesystemListTool } from './filesystem-list';

type ListDirectoryArgs = Parameters<typeof filesystemListTool.execute>[0];

export const listDirectoryTool: AgentTool<ListDirectoryArgs> = {
	...filesystemListTool,
	name: 'list_directory',
	description: toolDescription('list_directory'),
};
