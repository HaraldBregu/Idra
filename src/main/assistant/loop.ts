import type OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type {
	FunctionTool,
	ResponseFunctionToolCall,
	ResponseInputItem,
	ResponseOutputItem,
	Tool as ResponseTool,
} from 'openai/resources/responses/responses';
import type { Tool } from './tools/base';

const DEFAULT_MAX_ITERATIONS = 20;

export interface RunAgentParams {
	client: OpenAI;
	model: string | (() => string);
	userMessage: string;
	tools: Tool[];
	mcpTools?: ResponseTool.Mcp[];
	history?: ChatCompletionMessageParam[];
	systemPrompt?: string;
	maxIterations?: number;
}

export interface RunResult {
	text: string;
	newMessages: ChatCompletionMessageParam[];
}

function toFunctionTool(tool: Tool): FunctionTool {
	return {
		type: 'function',
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters,
		strict: false,
	};
}

function textFromContent(content: ChatCompletionMessageParam['content']): string {
	if (typeof content === 'string') return content;
	if (!Array.isArray(content)) return '';
	return content
		.map((part) => {
			if (typeof part === 'string') return part;
			if ('text' in part && typeof part.text === 'string') return part.text;
			return '';
		})
		.filter(Boolean)
		.join('\n');
}

function historyToInput(history: readonly ChatCompletionMessageParam[]): ResponseInputItem[] {
	const input: ResponseInputItem[] = [];

	for (const message of history) {
		if (message.role !== 'user' && message.role !== 'assistant') continue;
		const content = textFromContent(message.content);
		if (!content) continue;
		input.push({
			type: 'message',
			role: message.role,
			content,
		});
	}

	return input;
}

function isFunctionCall(item: ResponseOutputItem): item is ResponseFunctionToolCall {
	return item.type === 'function_call';
}

function approvalRequestSummary(output: readonly ResponseOutputItem[]): string | null {
	const requests = output.filter((item) => item.type === 'mcp_approval_request');
	if (requests.length === 0) return null;

	return requests
		.map((request) => {
			const args = 'arguments' in request ? request.arguments : '';
			return `Connector approval required for ${request.server_label}.${request.name}: ${args}`;
		})
		.join('\n');
}

/**
 * Responses API loop: local app capabilities are function tools; OpenAI connectors
 * are built-in MCP tools executed by the API.
 */
export async function runAgent(params: RunAgentParams): Promise<RunResult> {
	const {
		client,
		model,
		userMessage,
		tools,
		mcpTools = [],
		history = [],
		systemPrompt,
		maxIterations = DEFAULT_MAX_ITERATIONS,
	} = params;

	const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
	const responseTools: ResponseTool[] = [...tools.map(toFunctionTool), ...mcpTools];
	const baseInput = historyToInput(history);
	if (userMessage) {
		baseInput.push({ type: 'message', role: 'user', content: userMessage });
	}

	const newMessages: ChatCompletionMessageParam[] = [];
	if (userMessage) newMessages.push({ role: 'user', content: userMessage });

	let input: ResponseInputItem[] = baseInput;

	for (let i = 0; i < maxIterations; i++) {
		const response = await client.responses.create({
			model: typeof model === 'function' ? model() : model,
			instructions: systemPrompt,
			input,
			tools: responseTools.length ? responseTools : undefined,
		});

		const approvalSummary = approvalRequestSummary(response.output);
		if (approvalSummary) {
			newMessages.push({ role: 'assistant', content: approvalSummary });
			return { text: approvalSummary, newMessages };
		}

		const functionCalls = response.output.filter(isFunctionCall);
		if (functionCalls.length === 0) {
			const text = response.output_text ?? '';
			newMessages.push({ role: 'assistant', content: text });
			return { text, newMessages };
		}

		input = [
			...input,
			...response.output,
			...(
				await Promise.all(
					functionCalls.map(async (call) => {
						let args: Record<string, unknown> = {};
						try {
							args = JSON.parse(call.arguments);
						} catch {
							args = {};
						}

						const tool = toolMap.get(call.name);
						const output = tool ? await tool.execute(args) : `Error: unknown tool '${call.name}'`;

						return {
							type: 'function_call_output' as const,
							call_id: call.call_id,
							output,
						};
					})
				)
			),
		];
	}

	const text = 'Error: max iterations reached';
	newMessages.push({ role: 'assistant', content: text });
	return { text, newMessages };
}
