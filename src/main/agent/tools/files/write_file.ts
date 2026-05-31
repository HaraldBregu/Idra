import type { AgentTool } from '../core/types';
import { toolDescription } from '../metadata';
import { writeTool } from './write';

type WriteFileArgs = Parameters<typeof writeTool.execute>[0];

export const writeFileTool: AgentTool<WriteFileArgs> = {
	...writeTool,
	name: 'write_file',
	description: toolDescription('write_file'),
};
