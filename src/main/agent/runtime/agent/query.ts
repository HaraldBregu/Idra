import { runToolUse } from './execution';
import type { AgentContext, Message, ToolCall } from './types';
import type { ModelClient, ModelToolSchema } from './model';

export type QueryParams = {
	model: ModelClient;
	context: AgentContext;
	messages: Message[];
	systemPrompt: string;
	maxIterations?: number;
};

export type QueryEvent =
	| { type: 'assistant_message'; message: Message }
	| { type: 'tool_result'; message: Message };

export async function* query(params: QueryParams): AsyncGenerator<QueryEvent, { reason: 'complete' | 'max_iterations'; messages: Message[] }> {
	const maxIterations = params.maxIterations ?? 25;
	const messages = [...params.messages];
	params.context.messages = messages;
	for (let iteration = 0; iteration < maxIterations; iteration++) {
		const toolCalls: ToolCall[] = [];
		let text = '';
		for await (const event of params.model.stream({
			messages,
			systemPrompt: params.systemPrompt,
			tools: params.context.tools.map(toModelToolSchema),
			signal: params.context.abortSignal,
		})) {
			if (event.type === 'text_delta') text += event.text;
			if (event.type === 'tool_call') toolCalls.push(event.toolCall);
		}
		const assistant: Message = { role: 'assistant', content: text, toolCalls };
		messages.push(assistant);
		yield { type: 'assistant_message', message: assistant };
		if (toolCalls.length === 0) return { reason: 'complete', messages };
		for (const toolCall of toolCalls) {
			const result = await runToolUse(toolCall, params.context);
			messages.push(result);
			yield { type: 'tool_result', message: result };
		}
	}
	return { reason: 'max_iterations', messages };
}

function toModelToolSchema(tool: AgentContext['tools'][number]): ModelToolSchema {
	return {
		name: tool.name,
		description: tool.description,
		schema: zodSchemaToJsonSchema(tool.inputSchema),
	};
}

function zodSchemaToJsonSchema(schema: unknown): unknown {
	if (schema && typeof schema === 'object' && '_def' in schema) return schema;
	return schema;
}
