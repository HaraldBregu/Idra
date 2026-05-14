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
import {
	RunState,
	type PendingApproval,
	type PendingInputRequest,
	type PendingToolCall,
} from './run-state';
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
		status: 'ok' | 'error' | 'rejected' | 'input_resolved';
		outputChars: number;
	}) => void | Promise<void>;
	onApprovalRequest?: (info: {
		runId: string;
		iteration: number;
		pending: PendingApproval[];
	}) => void | Promise<void>;
	onInputRequest?: (info: {
		runId: string;
		iteration: number;
		pending: PendingInputRequest[];
	}) => void | Promise<void>;
	onFinish?: (info: {
		runId: string;
		iterations: number;
		status:
			| 'completed'
			| 'awaiting_approval'
			| 'awaiting_input'
			| 'max_iterations'
			| 'error';
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
			pendingInputs: PendingInputRequest[];
			newMessages: ChatCompletionMessageParam[];
			state: RunState;
			usage: TokenUsage;
			iterations: number;
	  }
	| {
			status: 'awaiting_input';
			text: string;
			pending: PendingApproval[];
			pendingInputs: PendingInputRequest[];
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

function safeParse(json: string): Record<string, unknown> {
	try {
		return JSON.parse(json) as Record<string, unknown>;
	} catch {
		return {};
	}
}

interface ToolExecContext {
	runId: string;
	iteration: number;
	state: RunState;
	toolMap: Map<string, Tool>;
	hooks?: RunHooks;
}

type ToolPlan =
	| { action: 'execute'; call: PendingToolCall; tool: Tool; effectiveArguments: string }
	| { action: 'rejected'; call: PendingToolCall; message: string }
	| { action: 'input_resolved'; call: PendingToolCall; output: string }
	| { action: 'pending_approval'; call: PendingToolCall; tool: Tool; request: PendingApproval }
	| { action: 'pending_input'; call: PendingToolCall; tool: Tool; request: PendingInputRequest }
	| { action: 'unknown_tool'; call: PendingToolCall };

async function classify(call: PendingToolCall, ctx: ToolExecContext): Promise<ToolPlan> {
	const tool = ctx.toolMap.get(call.name);
	if (!tool) return { action: 'unknown_tool', call };

	if (tool.kind === 'input') {
		const stored = ctx.state.inputResponseFor(call.callId);
		if (stored !== undefined) {
			return { action: 'input_resolved', call, output: stored };
		}
		const parsed = safeParse(call.arguments);
		const suggestions = Array.isArray(parsed.suggestions)
			? (parsed.suggestions.filter((v): v is string => typeof v === 'string') as string[])
			: undefined;
		return {
			action: 'pending_input',
			call,
			tool,
			request: {
				callId: call.callId,
				toolName: call.name,
				question: typeof parsed.question === 'string' ? parsed.question : '',
				suggestions,
			},
		};
	}

	const decision = ctx.state.decisionFor(call.callId, call.name);
	if (decision?.decision === 'reject') {
		return {
			action: 'rejected',
			call,
			message: decision.message ?? `Tool call '${call.name}' rejected by human reviewer.`,
		};
	}
	if (decision?.decision === 'approve') {
		return {
			action: 'execute',
			call,
			tool,
			effectiveArguments: decision.editedArguments ?? call.arguments,
		};
	}

	const requires = await tool.needsApproval(safeParse(call.arguments));
	if (requires) {
		return {
			action: 'pending_approval',
			call,
			tool,
			request: {
				callId: call.callId,
				toolName: call.name,
				arguments: call.arguments,
			},
		};
	}
	return { action: 'execute', call, tool, effectiveArguments: call.arguments };
}

async function executePlans(plans: ToolPlan[], ctx: ToolExecContext): Promise<ResponseInputItem[]> {
	return Promise.all(
		plans.map(async (plan) => {
			const start = Date.now();
			if (plan.action === 'unknown_tool') {
				const output = `Error: unknown tool '${plan.call.name}'`;
				await ctx.hooks?.onToolCall?.({
					runId: ctx.runId,
					iteration: ctx.iteration,
					callId: plan.call.callId,
					tool: plan.call.name,
					arguments: plan.call.arguments,
					durationMs: Date.now() - start,
					status: 'error',
					outputChars: output.length,
				});
				return { type: 'function_call_output' as const, call_id: plan.call.callId, output };
			}
			if (plan.action === 'rejected') {
				await ctx.hooks?.onToolCall?.({
					runId: ctx.runId,
					iteration: ctx.iteration,
					callId: plan.call.callId,
					tool: plan.call.name,
					arguments: plan.call.arguments,
					durationMs: Date.now() - start,
					status: 'rejected',
					outputChars: plan.message.length,
				});
				return {
					type: 'function_call_output' as const,
					call_id: plan.call.callId,
					output: plan.message,
				};
			}
			if (plan.action === 'input_resolved') {
				await ctx.hooks?.onToolCall?.({
					runId: ctx.runId,
					iteration: ctx.iteration,
					callId: plan.call.callId,
					tool: plan.call.name,
					arguments: plan.call.arguments,
					durationMs: Date.now() - start,
					status: 'input_resolved',
					outputChars: plan.output.length,
				});
				return {
					type: 'function_call_output' as const,
					call_id: plan.call.callId,
					output: plan.output,
				};
			}
			if (plan.action === 'execute') {
				const args = safeParse(plan.effectiveArguments);
				try {
					const output = await plan.tool.execute(args);
					await ctx.hooks?.onToolCall?.({
						runId: ctx.runId,
						iteration: ctx.iteration,
						callId: plan.call.callId,
						tool: plan.call.name,
						arguments: plan.effectiveArguments,
						durationMs: Date.now() - start,
						status: 'ok',
						outputChars: output.length,
					});
					return {
						type: 'function_call_output' as const,
						call_id: plan.call.callId,
						output,
					};
				} catch (err) {
					const output = `Error executing ${plan.call.name}: ${(err as Error).message}`;
					await ctx.hooks?.onToolCall?.({
						runId: ctx.runId,
						iteration: ctx.iteration,
						callId: plan.call.callId,
						tool: plan.call.name,
						arguments: plan.effectiveArguments,
						durationMs: Date.now() - start,
						status: 'error',
						outputChars: output.length,
					});
					return {
						type: 'function_call_output' as const,
						call_id: plan.call.callId,
						output,
					};
				}
			}
			// pending_* plans never reach executePlans — caller filters
			throw new Error(`executePlans received pending plan for ${plan.call.name}`);
		})
	);
}

/**
 * Responses API loop with human-in-the-loop and lifecycle hooks.
 *
 * Two interruption modes share the same pause/resume infrastructure:
 *   - **Approval**: a normal tool exposes {@link Tool.needsApproval} as truthy
 *     and no decision is recorded yet. Resolve via `state.approve` /
 *     `state.reject` (optionally with edited args or rejection message).
 *   - **Input**: a tool with `kind === 'input'` (e.g. `ask_human`) is called
 *     by the model. Resolve via `state.recordInputResponse(callId, answer)`.
 *
 * When any classifications come back pending, the loop persists the deferred
 * function calls onto the state and returns. Call {@link runAgent} again with
 * the same state to resume — deferred calls run in order using the recorded
 * decisions / answers, and the conversation continues.
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

	const pauseFor = async (
		approvals: PendingApproval[],
		inputs: PendingInputRequest[],
		deferred: PendingToolCall[],
		iter: number
	): Promise<RunOutcome> => {
		state.setPending(approvals);
		state.setPendingInputs(inputs);
		state.data.pendingToolCalls = deferred;
		if (approvals.length > 0) {
			await hooks?.onApprovalRequest?.({ runId, iteration: iter, pending: approvals });
		}
		if (inputs.length > 0) {
			await hooks?.onInputRequest?.({ runId, iteration: iter, pending: inputs });
		}
		const status: 'awaiting_approval' | 'awaiting_input' =
			approvals.length > 0 ? 'awaiting_approval' : 'awaiting_input';
		const summary =
			approvals.length > 0
				? `Awaiting human approval for ${approvals.length} tool call(s): ${approvals
						.map((p) => p.toolName)
						.join(', ')}`
				: `Awaiting human input: ${inputs.map((p) => p.question).join(' / ')}`;
		await hooks?.onFinish?.({
			runId,
			iterations: iter + 1,
			status,
			usage,
			outputChars: 0,
			durationMs: Date.now() - runStart,
		});
		return {
			status,
			text: summary,
			pending: approvals,
			pendingInputs: inputs,
			newMessages: state.data.newMessages,
			state,
			usage,
			iterations: iter + 1,
		};
	};

	const ctx: ToolExecContext = {
		runId,
		iteration: state.data.iteration,
		state,
		toolMap,
		hooks,
	};

	try {
		// Resume path: drain deferred tool calls before talking to the model.
		if (state.data.pendingToolCalls.length > 0) {
			const plans = await Promise.all(
				state.data.pendingToolCalls.map((c) => classify(c, ctx))
			);
			const stillApproval = plans
				.filter((p): p is Extract<ToolPlan, { action: 'pending_approval' }> => p.action === 'pending_approval')
				.map((p) => p.request);
			const stillInput = plans
				.filter((p): p is Extract<ToolPlan, { action: 'pending_input' }> => p.action === 'pending_input')
				.map((p) => p.request);
			if (stillApproval.length > 0 || stillInput.length > 0) {
				return pauseFor(stillApproval, stillInput, state.data.pendingToolCalls, state.data.iteration);
			}
			const executable = plans.filter(
				(p): p is Exclude<ToolPlan, { action: 'pending_approval' | 'pending_input' }> =>
					p.action !== 'pending_approval' && p.action !== 'pending_input'
			);
			const outputs = await executePlans(executable, ctx);
			state.data.input = [...state.data.input, ...outputs];
			state.data.pendingToolCalls = [];
			state.setPending([]);
			state.setPendingInputs([]);
		}

		for (; state.data.iteration < maxIterations; state.data.iteration++) {
			const iter = state.data.iteration;
			ctx.iteration = iter;
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

			const deferred: PendingToolCall[] = functionCalls.map((c) => ({
				callId: c.call_id,
				name: c.name,
				arguments: c.arguments,
			}));
			const plans = await Promise.all(deferred.map((c) => classify(c, ctx)));
			const approvals = plans
				.filter((p): p is Extract<ToolPlan, { action: 'pending_approval' }> => p.action === 'pending_approval')
				.map((p) => p.request);
			const inputs = plans
				.filter((p): p is Extract<ToolPlan, { action: 'pending_input' }> => p.action === 'pending_input')
				.map((p) => p.request);

			if (approvals.length > 0 || inputs.length > 0) {
				state.data.input = [
					...state.data.input,
					...(response.output as unknown as ResponseInputItem[]),
				];
				return pauseFor(approvals, inputs, deferred, iter);
			}

			const executable = plans.filter(
				(p): p is Exclude<ToolPlan, { action: 'pending_approval' | 'pending_input' }> =>
					p.action !== 'pending_approval' && p.action !== 'pending_input'
			);
			const toolOutputs = await executePlans(executable, ctx);
			state.data.input = [
				...state.data.input,
				...(response.output as unknown as ResponseInputItem[]),
				...toolOutputs,
			];
			state.setPending([]);
			state.setPendingInputs([]);
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
