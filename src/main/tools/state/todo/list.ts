import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { renderTodos } from '../shared/render-todos';

export const listTodosTool: AgentTool = {
	name: 'list_todos',
	description: 'List the current run todo items and statuses.',
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
