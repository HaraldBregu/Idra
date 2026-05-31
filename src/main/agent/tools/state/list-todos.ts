import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';
import { renderTodos } from './render-todos';

export const listTodosTool: AgentTool = {
	name: 'list_todos',
	description: toolDescription('list_todos'),
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	async execute(_args, ctx) {
		return textResult(renderTodos(ctx.plan.entries));
	},
};
