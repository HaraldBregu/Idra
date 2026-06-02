import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../base/metadata';
import { renderTodos } from './internal/render-todos';

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
