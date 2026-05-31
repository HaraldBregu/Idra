import type { AgentTool } from '../core/types';
import { readTool } from '../files/tools';
import { toolDescription } from '../metadata';

type ReadFileArgs = Parameters<typeof readTool.execute>[0];

export const readFileTool: AgentTool<ReadFileArgs> = {
	...readTool,
	name: 'read_file',
	description: toolDescription('read_file'),
};
