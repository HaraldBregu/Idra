import type { AgentTool } from '../core/types';
import { findTool } from '../files/tools';
import { toolDescription } from '../metadata';

type SearchFilesArgs = Parameters<typeof findTool.execute>[0];

export const searchFilesTool: AgentTool<SearchFilesArgs> = {
	...findTool,
	name: 'search_files',
	description: toolDescription('search_files'),
};
