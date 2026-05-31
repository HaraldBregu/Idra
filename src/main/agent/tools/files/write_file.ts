import type { AgentTool } from '../core/types';
import { writeTool } from '../files/tools';
import { toolDescription } from '../metadata';

type WriteFileArgs = Parameters<typeof writeTool.execute>[0];

export const writeFileTool: AgentTool<WriteFileArgs> = {
	...writeTool,
	name: 'write_file',
	description: toolDescription('write_file'),
};
