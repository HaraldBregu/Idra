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
import { RunState, type PendingApproval, type PendingToolCall } from './run-state';
import type { TokenUsage } from './run-logger';

const DEFAULT_MAX_ITERATIONS = 20;

export interface RunHooks {
	onStart?: (info: { runId: string; iteration: number }) => void | Promise<void>;
	onIteration?: (info: {
		runId: string;
		iteration: number;
		usage?: TokenUsage;
		durationMs: number;
	}) => void | Promise<void>;
	onToolCall?: (info: {
		runId: string;
		iteration: number;
		callId: string;
		tool: string;
		arguments: string;
		durationMs: number;
		status: 'ok' | 'error' | 'rejected';
		outputChars: number;
	}) => void | Promise<void>;
	onApprovalRequest?: (info: {
		runId: string;
		iteration: number;
		pending: PendingApproval[];
	}) => void | Promise<void>;
	onFinish?: (info: {
		runId: string;
		iterations: number;
		status: 'completed' | 'awaiting_approval' | 'max_iterations' | 'error';
		usage: TokenUsage;
		outputChars: number;
		durationMs: number;
		error?: Error;
	}) => void | Promise<void>;
}

export interface RunAgentParams {
	client: OpenAI;
	model: string | (() => string);
	tools: Tool[];
	mcpTools?: ResponseTool.Mcp[];
	state: RunState;
	maxIterations?: number;
	hooks?: RunHooks;
}

export type RunOutcome =
	| {
			status: 'done';
			text: string;
			newMessages: ChatCompletionMessageParam[];
			state: RunState;
			usage: TokenUsage;
			iterations: number;
	  }
	| {
			status: 'awaiting_approval';
			text: string;
			pending: PendingApproval[];
			newMessages: ChatCompletionMessageParam[];
			state: RunState;
			usage: TokenUsage;
			iterations: number;
	  }
	| {
			status: 'max_iterations';
			text: string;
			newMessages: ChatCompletionMessageParam[];
			state: RunState;
			usage: TokenUsage;
			iterations: number;
	  };

function toFunctionTool(tool: Tool): FunctionTool {
	return {
		type: 'function',
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters,
		strict: false,
	};
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

function emptyUsage(): TokenUsage {
	return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

function addUsage(acc: TokenUsage, u?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } | null): void {
	if (!u) return;
	acc.inputTokens += u.input_tokens ?? 0;
	acc.outputTokens += u.output_tokens ?? 0;
	acc.totalTokens += u.total_tokens ?? (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
}

interface ToolExecContext {
	runId: string;
	iteration: number;
	state: RunState;
	toolMap: Map<string, Tool>;
	hooks?: RunHooks;
}

async function executePendingToolCalls(
	calls: PendingToolCall[],
	ctx: ToolExecContext
): Promise<ResponseInputItem[]> {
	return Promise.all(
		calls.map(async (call) => {
			const start = Date.now();
			const tool = ctx.toolMap.get(call.name);
			const decision = ctx.state.decisionFor(call.callId, call.name);

			if (!tool) {
				const output = `Error: unknown tool '${call.name}'`;
				await ctx.hooks?.onToolCall?.({
					runId: ctx.runId,
					iteration: ctx.iteration,
					callId: call.callId,
					tool: call.name,
					arguments: call.arguments,
					durationMs: Date.now() - start,
					status: 'error',
					outputChars: output.length,
				});
				return { type: 'function_call_output' as const, call_id: call.callId, output };
			}

			if (decision?.decision === 'reject') {
				const output =
					decision.message ?? `Tool call '${call.name}' rejected by human reviewer.`;
				await ctx.hooks?.onToolCall?.({
					runId: ctx.runId,
					iteration: ctx.iteration,
					callId: call.callId,
					tool: call.name,
					arguments: call.arguments,
					durationMs: Date.now() - start,
					status: 'rejected',
					outputChars: output.length,
				});
				return { type: 'function_call_output' as const, call_id: call.callId, output };
			}

			let args: Record<string, unknown> = {};
			try {
				args = JSON.parse(call.arguments);
			} catch {
				args = {};
			}

			try {
				const output = await tool.execute(args);
				await ctx.hooks?.onToolCall?.({
					runId: ctx.runId,
					iteration: ctx.iteration,
					callId: call.callId,
					tool: call.name,
					arguments: call.arguments,
					durationMs: Date.now() - start,
					status: 'ok',
					outputChars: output.length,
				});
				return { type: 'function_call_output' as const, call_id: call.callId, output };
			} catch (err) {
				const output = `Error executing ${call.name}: ${(err as Error).message}`;
				await ctx.hooks?.onToolCall?.({
					runId: ctx.runId,
					iteration: ctx.iteration,
					callId: call.callId,
					tool: call.name,
					arguments: call.arguments,
					durationMs: Date.now() - start,
					status: 'error',
					outputChars: output.length,
				});
				return { type: 'function_call_output' as const, call_id: call.callId, output };
			}
		})
	);
}

/**
 * Responses API loop with human-in-the-loop approval and lifecycle hooks.
 *
 * State is threaded via {@link RunState}. When a tool exposes
 * {@link Tool.needsApproval} and no decision is recorded yet the loop pauses,
 * stores both the pending approvals and the matching function calls on the
 * state, and returns `status: 'awaiting_approval'`. The host resolves each
 * one with `state.approve` / `state.reject` and calls {@link runAgent} again
 * with the same state to resume — at which point the loop executes the
 * deferred tool calls and feeds the outputs back to the model.
 */
export async function runAgent(params: RunAgentParams): Promise<RunOutcome> {
	const {
		client,
		model,
		tools,
		mcpTools = [],
		state,
		maxIterations = DEFAULT_MAX_ITERATIONS,
		hooks,
	} = params;

	const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
	const responseTools: ResponseTool[] = [...tools.map(toFunctionTool), ...mcpTools];
	const usage = emptyUsage();
	const runStart = Date.now();
	const runId = state.data.runId;

	state.clearResolved();

	await hooks?.onStart?.({ runId, iteration: state.data.iteration });

	try {
		// Resume path: execute deferred tool calls before talking to the model.
		if (state.data.pendingToolCalls.length > 0) {
			const outputs = await executePendingToolCalls(state.data.pendingToolCalls, {
				runId,
				iteration: state.data.iteration,
				state,
				toolMap,
				hooks,
			});
			state.data.input = [...state.data.input, ...outputs];
			state.data.pendingToolCalls = [];
		}

		for (; state.data.iteration < maxIterations; state.data.iteration++) {
			const iter = state.data.iteration;
			const iterStart = Date.now();
			const response = await client.responses.create({
				model: typeof model === 'function' ? model() : model,
				instructions: state.data.systemPrompt,
				input: state.data.input,
				tools: responseTools.length ? responseTools : undefined,
			});

			const iterUsage: TokenUsage = emptyUsage();
			addUsage(iterUsage, response.usage as never);
			addUsage(usage, response.usage as never);

			await hooks?.onIteration?.({
				runId,
				iteration: iter,
				usage: iterUsage,
				durationMs: Date.now() - iterStart,
			});

			const approvalSummary = approvalRequestSummary(response.output);
			if (approvalSummary) {
				state.data.newMessages.push({ role: 'assistant', content: approvalSummary });
				await hooks?.onFinish?.({
					runId,
					iterations: iter + 1,
					status: 'completed',
					usage,
					outputChars: approvalSummary.length,
					durationMs: Date.now() - runStart,
				});
				return {
					status: 'done',
					text: approvalSummary,
					newMessages: state.data.newMessages,
					state,
					usage,
					iterations: iter + 1,
				};
			}

			const functionCalls = response.output.filter(isFunctionCall);
			if (functionCalls.length === 0) {
				const text = response.output_text ?? '';
				state.data.newMessages.push({ role: 'assistant', content: text });
				await hooks?.onFinish?.({
					runId,
					iterations: iter + 1,
					status: 'completed',
					usage,
					outputChars: text.length,
					durationMs: Date.now() - runStart,
				});
				return {
					status: 'done',
					text,
					newMessages: state.data.newMessages,
					state,
					usage,
					iterations: iter + 1,
				};
			}

			const pendingApprovals: PendingApproval[] = [];
			for (const call of functionCalls) {
				const tool = toolMap.get(call.name);
				if (!tool) continue;
				if (state.decisionFor(call.call_id, call.name)) continue;
				let args: Record<string, unknown> = {};
				try {
					args = JSON.parse(call.arguments);
				} catch {
					args = {};
				}
				const requires = await tool.needsApproval(args);
				if (requires) {
					pendingApprovals.push({
						callId: call.call_id,
						toolName: call.name,
						arguments: call.arguments,
					});
				}
			}

			if (pendingApprovals.length > 0) {
				state.setPending(pendingApprovals);
				state.data.pendingToolCalls = functionCalls.map((call) => ({
					callId: call.call_id,
					name: call.name,
					arguments: call.arguments,
				}));
				state.data.input = [
					...state.data.input,
					...(response.output as unknown as ResponseInputItem[]),
				];
				await hooks?.onApprovalRequest?.({ runId, iteration: iter, pending: pendingApprovals });
				const summary = `Awaiting human approval for ${pendingApprovals.length} tool call(s): ${pendingApprovals
					.map((p) => p.toolName)
					.join(', ')}`;
				await hooks?.onFinish?.({
					runId,
					iterations: iter + 1,
					status: 'awaiting_approval',
					usage,
					outputChars: 0,
					durationMs: Date.now() - runStart,
				});
				return {
					status: 'awaiting_approval',
					text: summary,
					pending: pendingApprovals,
					newMessages: state.data.newMessages,
					state,
					usage,
					iterations: iter + 1,
				};
			}

			const toolOutputs = await executePendingToolCalls(
				functionCalls.map((call) => ({
					callId: call.call_id,
					name: call.name,
					arguments: call.arguments,
				})),
				{ runId, iteration: iter, state, toolMap, hooks }
			);

			state.data.input = [
				...state.data.input,
				...(response.output as unknown as ResponseInputItem[]),
				...toolOutputs,
			];
			state.setPending([]);
		}

		const text = 'Error: max iterations reached';
		state.data.newMessages.push({ role: 'assistant', content: text });
		await hooks?.onFinish?.({
			runId,
			iterations: state.data.iteration,
			status: 'max_iterations',
			usage,
			outputChars: text.length,
			durationMs: Date.now() - runStart,
		});
		return {
			status: 'max_iterations',
			text,
			newMessages: state.data.newMessages,
			state,
			usage,
			iterations: state.data.iteration,
		};
	} catch (err) {
		await hooks?.onFinish?.({
			runId,
			iterations: state.data.iteration,
			status: 'error',
			usage,
			outputChars: 0,
			durationMs: Date.now() - runStart,
			error: err as Error,
		});
		throw err;
	}
}
