import { defineAgentTools } from './types';

export const AGENT_TOOL_TASK_TOOLS = defineAgentTools([
	{
		name: 'todo_create',
		title: 'Create todo',
		description: 'Create a local todo entry for the current run.',
	},
	{
		name: 'todo_update',
		title: 'Update todo',
		description: 'Update a local todo entry for the current run.',
	},
	{
		name: 'todo_complete',
		title: 'Complete todo',
		description: 'Mark a local todo as completed.',
	},
]);
