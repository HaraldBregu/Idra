import type { AgentTool } from '../core/types';
import { toolDescription } from '../metadata';
import { readTool } from './read';

type ReadFileArgs = Parameters<typeof readTool.execute>[0];

export const readFileTool: AgentTool<ReadFileArgs> = {
	...readTool,
	name: 'read_file',
	description: toolDescription('read_file'),
};
