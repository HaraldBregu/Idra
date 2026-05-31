import type { AgentTool } from '../core/types';
import { toolDescription } from '../metadata';
import { findTool } from './find';

type SearchFilesArgs = Parameters<typeof findTool.execute>[0];

export const searchFilesTool: AgentTool<SearchFilesArgs> = {
	...findTool,
	name: 'search_files',
	description: toolDescription('search_files'),
};
