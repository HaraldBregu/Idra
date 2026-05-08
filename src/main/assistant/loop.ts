import type OpenAI from 'openai';
import type {
	ChatCompletionMessageParam,
	ChatCompletionTool,
	ChatCompletionMessageToolCall,
	ChatCompletionMessageFunctionToolCall,
} from 'openai/resources/chat/completions';
import type { Tool } from './tools/base';

const DEFAULT_MAX_ITERATIONS = 20;

export interface RunAgentParams {
	client: OpenAI;
	model: string | (() => string);
	userMessage: string;
	tools: Tool[];
	history?: ChatCompletionMessageParam[];
	systemPrompt?: string;
	maxIterations?: number;
}

export interface RunResult {
	text: string;
	newMessages: ChatCompletionMessageParam[];
}

function isFunctionToolCall(
	tc: ChatCompletionMessageToolCall
): tc is ChatCompletionMessageFunctionToolCall {
	return (tc as { type?: string }).type === 'function' || 'function' in tc;
}

/**
 * ReAct-style loop: model proposes tool calls, we execute, feed results back,
 * repeat until the model returns a plain text answer or we hit maxIterations.
 */
export async function runAgent(params: RunAgentParams): Promise<RunResult> {
	const {
		client,
		model,
		userMessage,
		tools,
		history = [],
		systemPrompt,
		maxIterations = DEFAULT_MAX_ITERATIONS,
	} = params;

	const toolMap = new Map(tools.map((t) => [t.name, t]));
	const toolSchemas = tools.map((t) => t.schema() as ChatCompletionTool);

	const messages: ChatCompletionMessageParam[] = [];
	if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
	messages.push(...history);
	if (userMessage) messages.push({ role: 'user', content: userMessage });

	const newMessages: ChatCompletionMessageParam[] = [];
	if (userMessage) newMessages.push({ role: 'user', content: userMessage });

	for (let i = 0; i < maxIterations; i++) {
		const response = await client.chat.completions.create({
			model: typeof model === 'function' ? model() : model,
			messages,
			tools: toolSchemas.length ? toolSchemas : undefined,
		});

		const msg = response.choices[0].message;

		const assistantMsg: ChatCompletionMessageParam = {
			role: 'assistant',
			content: msg.content ?? '',
		};
		if (msg.tool_calls && msg.tool_calls.length) {
			(assistantMsg as { tool_calls?: ChatCompletionMessageToolCall[] }).tool_calls =
				msg.tool_calls;
		}

		messages.push(assistantMsg);
		newMessages.push(assistantMsg);

		if (!msg.tool_calls || msg.tool_calls.length === 0) {
			return { text: msg.content ?? '', newMessages };
		}

		for (const tc of msg.tool_calls) {
			if (!isFunctionToolCall(tc)) continue;
			const fnName = tc.function.name;
			let fnArgs: Record<string, unknown> = {};
			try {
				fnArgs = JSON.parse(tc.function.arguments);
			} catch {
				fnArgs = {};
			}

			const tool = toolMap.get(fnName);
			const result = tool ? await tool.execute(fnArgs) : `Error: unknown tool '${fnName}'`;

			const toolResultMsg: ChatCompletionMessageParam = {
				role: 'tool',
				tool_call_id: tc.id,
				content: result,
			};
			messages.push(toolResultMsg);
			newMessages.push(toolResultMsg);
		}
	}

	return { text: 'Error: max iterations reached', newMessages };
}
