import type {
	AgentContentBlock,
	ToolResultBlock,
	ToolResultStatus,
	Usage,
} from '../provider/types';
import { ContextOverflowError } from '../provider/types';
import type { ProviderAdapter } from '../provider/types';
import type { AgentTool, ToolContext } from '../tools';
import {
	type AgentToolManagementOptions,
	ToolService,
	type ToolServicePort,
} from '../tools/service';
import { compact } from './compaction';
import { agentLogger } from './logger';
import { flushSessionMemoryBeforeCompaction } from '../memory-runtime';
import type { SessionFile } from '../session/store';
import type {
	AgentRunState,
	ModelReasoningEffort,
	ReasoningSummaryState,
} from '../../shared/agents/service';
import { makeProvider, type ProviderSpec } from '../provider/factory';
import { buildAgentHookContext, type AgentHarnessHookContext } from './harness/hook-context';
import { fireAfterToolCallHook, fireBeforeMessageWriteHook } from './harness/hook-helpers';
import {
	fireAgentEndHook,
	fireLlmInputHook,
	fireLlmOutputHook,
} from './harness/lifecycle-hook-helpers';
import {
	listAgentToolResultMiddlewareRegistrations,
	runAgentToolResultMiddleware,
	sanitizeToolResultDetails,
} from './harness/tool-result-middleware';

export interface AgentProviderLookup {
	getAssistantOperator(): { provider: { id: string }; model: { id: string; name: string; effort?: ModelReasoningEffort } } | undefined;
	getProviderById(id: string): { apiKey: string; baseUrl?: string } | undefined;
}

export interface AgentRunHooks {
	onStart?: (info: { runId: string }) => void | Promise<void>;
	onIteration?: (info: {
		runId: string;
		iteration: number;
		usage: Usage;
		durationMs: number;
	}) => void | Promise<void>;
	onToolCall?: (info: {
		runId: string;
		iteration: number;
		callId: string;
		tool: string;
		args: unknown;
		status: 'ok' | 'error' | 'rejected';
		durationMs: number;
		outputChars: number;
		outputText?: string;
	}) => void | Promise<void>;
	onFinish?: (info: {
		runId: string;
		stopReason: AgentRunResult['stopReason'];
		usage: Usage;
		iterations: number;
		durationMs: number;
		outputChars: number;
		firstTokenLatencyMs?: number;
		error?: Error;
	}) => void | Promise<void>;
}

export type AgentRunStreamEvent =
	| { type: 'run_state'; state: AgentRunState; label?: string }
	| {
			type: 'reasoning_summary';
			id: string;
			title: string;
			summary: string;
			state: ReasoningSummaryState;
	  }
	| { type: 'text_delta'; delta: string }
	| {
			type: 'tool_call_start';
			iteration: number;
			toolCallId: string;
			toolName: string;
	  }
	| {
			type: 'tool_call_args_delta';
			iteration: number;
			toolCallId: string;
			toolName: string;
			jsonDelta: string;
			argsText: string;
	  }
	| {
			type: 'tool_call_input';
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			argsText: string;
	  }
	| {
			type: 'tool_call_result';
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			output: unknown;
			outputText: string;
			status: 'ok' | 'error' | 'rejected';
			durationMs: number;
			errorText?: string;
	  };

export interface AgentRunInput {
	runId: string;
	userMessage: string;
	systemPrompt: string;
	session: SessionFile;
	provider?: ProviderAdapter;
	providerId?: string;
	model?: string;
	agentHarnessId?: string;
	requestedRuntime?: string;
	storedRuntime?: string;
	effort?: ModelReasoningEffort;
	tools: AgentTool[];
	ctx: ToolContext;
	maxTokens?: number;
	maxIterations?: number;
	streamOutput?: (chunk: string) => void;
	streamEvent?: (event: AgentRunStreamEvent) => void;
	hooks?: AgentRunHooks;
	signal?: AbortSignal;
	toolManagement?: AgentToolManagementOptions;
	toolService?: ToolServicePort;
	store?: AgentProviderLookup;
	providerFactory?: (spec: ProviderSpec) => ProviderAdapter;
}

export interface AgentRunResult {
	finalText: string;
	toolCalls: number;
	usage: Usage;
	stopReason: 'end_turn' | 'max_tokens' | 'max_iterations' | 'error' | 'cancelled';
	session: SessionFile;
}

function parseToolArgs(argsStr: string, fallback: unknown): unknown {
	if (!argsStr.trim()) return {};
	try {
		return JSON.parse(argsStr);
	} catch {
		return fallback;
	}
}

function parseToolArgsForExecution(
	toolName: string,
	argsStr: string
): { ok: true; args: unknown } | { ok: false; args: unknown; message: string } {
	if (!argsStr.trim()) return { ok: true, args: {} };
	try {
		return { ok: true, args: JSON.parse(argsStr) };
	} catch (error) {
		const detail = error instanceof Error ? error.message : 'invalid JSON';
		return {
			ok: false,
			args: { __unparsed: argsStr },
			message: `Invalid JSON arguments for ${toolName}: ${detail}. The tool was not executed.`,
		};
	}
}

function isVisibleAssistantBlock(
	block: AgentContentBlock
): block is Extract<AgentContentBlock, { type: 'text' | 'tool_use' }> {
	return block.type === 'text' || block.type === 'tool_use';
}

function resultBlocksToText(content: ToolResultBlock[]): string {
	return content.map((c) => (c.type === 'text' ? c.text : '[binary content]')).join('\n');
}

function resultBlocksToOutput(content: ToolResultBlock[]): unknown {
	if (content.length === 1) {
		const block = content[0];
		if (block?.type === 'text') return block.text ?? '';
	}

	return content.map((block) => {
		if (block.type === 'text') {
			return { type: 'text', text: block.text };
		}

		return {
			type: 'image',
			mimeType: block.mimeType ?? 'image/png',
			base64: block.base64 ? '[base64 image]' : undefined,
		};
	});
}

function toolResultOutput(content: ToolResultBlock[], details?: unknown): unknown {
	return details === undefined ? resultBlocksToOutput(content) : details;
}

function normalizeRuntimeId(input: unknown): string | undefined {
	if (typeof input !== 'string') return undefined;
	const runtime = input.trim().toLowerCase();
	return runtime || undefined;
}

function resolveRunHarnessRuntime(input: AgentRunInput): string | undefined {
	return (
		normalizeRuntimeId(input.agentHarnessId) ??
		normalizeRuntimeId(input.requestedRuntime) ??
		normalizeRuntimeId(input.storedRuntime)
	);
}

function buildRunHookContext(params: {
	runId: string;
	input: AgentRunInput;
	session: SessionFile;
	ctx: ToolContext;
	model: string;
}): AgentHarnessHookContext {
	return buildAgentHookContext({
		runId: params.runId,
		agentId: params.ctx.agentId,
		sessionId: params.session.id,
		sessionKey: params.ctx.sessionId,
		provider: params.input.providerId,
		modelId: params.model,
		channelId: readString(params.ctx.deliveryContext?.channelId),
	});
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function assistantBlocksToHookText(blocks: AgentContentBlock[]): string {
	return blocks
		.map((block) => {
			if (block.type === 'text') return block.text;
			if (block.type === 'tool_use') return `[tool ${block.toolName}]`;
			return '';
		})
		.filter(Boolean)
		.join('\n');
}

async function applyToolResultMiddlewareForRun(params: {
	content: ToolResultBlock[];
	hookContext: AgentHarnessHookContext;
	runtime?: string;
}): Promise<ToolResultBlock[]> {
	return runAgentToolResultMiddleware(
		params.content,
		listAgentToolResultMiddlewareRegistrations(),
		params.hookContext,
		params.runtime
	);
}

async function prepareToolResultForRun(params: {
	content: ToolResultBlock[];
	details?: unknown;
	hookContext: AgentHarnessHookContext;
	runtime?: string;
}): Promise<{ content: ToolResultBlock[]; outputText: string; output: unknown }> {
	const content = await applyToolResultMiddlewareForRun({
		content: params.content,
		hookContext: params.hookContext,
		runtime: params.runtime,
	});
	const outputText = resultBlocksToText(content);
	return {
		content,
		outputText,
		output: toolResultOutput(content, params.details),
	};
}

/**
 * Provider-neutral agent loop.
 *
 * Streams text deltas through `streamOutput`. Tool calls go through
 * the tool service pre-call guard. On context overflow,
 * compacts the transcript once and retries. The whole run is abortable
 * via `signal`.
 */
function resolveProviderAndModel(input: AgentRunInput): { provider: ProviderAdapter; model: string; effort: ModelReasoningEffort | undefined } {
	if (input.provider && input.model) {
		return { provider: input.provider, model: input.model, effort: input.effort };
	}
	const store = input.store;
	if (!store) {
		throw new Error('provider and model are required when no store is provided.');
	}
	const operator = store.getAssistantOperator();
	if (!operator) throw new Error('Agent provider not configured.');
	const providerId = operator.provider.id.trim().toLowerCase();
	const model = input.model?.trim() || operator.model.id.trim() || operator.model.name.trim();
	if (!model) throw new Error('Agent model not configured.');
	const providerConfig = store.getProviderById(providerId);
	if (!providerConfig) throw new Error(`Provider not configured: ${providerId}`);
	const apiKey = providerConfig.apiKey.trim();
	if (!apiKey) throw new Error(`API key missing for provider: ${providerId}`);
	const factory = input.providerFactory ?? makeProvider;
	const provider = input.provider ?? factory({ id: providerId, apiKey, baseURL: providerConfig.baseUrl });
	const effort = input.effort ?? operator.model.effort;
	return { provider, model, effort };
}

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
	const { provider, model, effort } = resolveProviderAndModel(input);
	const {
		runId,
		userMessage,
		systemPrompt,
		session,
		tools,
		ctx,
		maxTokens = 4096,
		maxIterations = 25,
		streamOutput,
		streamEvent,
		hooks,
		signal,
	} = input;

	const toolService = input.toolService ?? new ToolService();
	const tracker = toolService.createCallTracker();
	const toolPreparation = toolService.prepareToolsForRun({
		tools,
		ctx,
		userMessage,
		provider: input.providerId,
		modelId: model,
		management: input.toolManagement,
	});
	const toolManagement = toolPreparation.management;
	const toolsForPrompt = toolPreparation.toolsForPrompt;
	const systemPromptForTurn = toolPreparation.systemPromptSuffix
		? `${systemPrompt}\n\n${toolPreparation.systemPromptSuffix}`
		: systemPrompt;
	const totalUsage: Usage = { inputTokens: 0, outputTokens: 0 };
	let finalText = '';
	let toolCalls = 0;
	let stopReason: AgentRunResult['stopReason'] = 'end_turn';
	let didCompact = false;
	let didStartAnswering = false;
	let completedIterations = 0;
	let firstTokenLatencyMs: number | undefined;
	const runStart = Date.now();
	const hookContext = buildRunHookContext({ runId, input, session, ctx, model });
	const harnessRuntime = resolveRunHarnessRuntime(input);
	let didFireAgentEndHook = false;
	const fireAgentEndOnce = async (): Promise<void> => {
		if (didFireAgentEndHook) return;
		didFireAgentEndHook = true;
		await fireAgentEndHook({
			...hookContext,
			stopReason,
			turnCount: completedIterations,
		});
	};
	const recordToolResult = async (params: {
		iteration: number;
		toolUseId: string;
		toolName: string;
		args: unknown;
		status: ToolResultStatus;
		durationMs: number;
		toolResult: Awaited<ReturnType<typeof prepareToolResultForRun>>;
		isError?: boolean;
	}): Promise<void> => {
		const isError = params.isError ?? params.status !== 'ok';
		await hooks?.onToolCall?.({
			runId,
			iteration: params.iteration,
			callId: params.toolUseId,
			tool: params.toolName,
			args: params.args,
			status: params.status,
			durationMs: params.durationMs,
			outputChars: params.toolResult.outputText.length,
			outputText: params.toolResult.outputText,
		});
		streamEvent?.({
			type: 'tool_call_result',
			iteration: params.iteration,
			toolCallId: params.toolUseId,
			toolName: params.toolName,
			input: params.args,
			output: params.toolResult.output,
			outputText: params.toolResult.outputText,
			status: params.status,
			durationMs: params.durationMs,
			errorText: params.status !== 'ok' ? params.toolResult.outputText : undefined,
		});
		await fireAfterToolCallHook({
			...hookContext,
			toolName: params.toolName,
			toolUseId: params.toolUseId,
			result: params.toolResult.content,
			isError,
		});
		await fireBeforeMessageWriteHook({
			...hookContext,
			role: 'tool',
			content: params.toolResult.outputText,
			sessionKey: hookContext.sessionKey,
		});
		session.transcript.push({
			role: 'tool',
			toolUseId: params.toolUseId,
			isError,
			status: params.status,
			content: params.toolResult.content,
		});
	};

	await fireBeforeMessageWriteHook({
		...hookContext,
		role: 'user',
		content: userMessage,
		sessionKey: hookContext.sessionKey,
	});
	session.transcript.push({ role: 'user', content: userMessage });

	await hooks?.onStart?.({ runId });
	agentLogger.info('agent:run', 'run started', { runId, model, tools: tools.map((t) => t.name), userMessageLen: userMessage.length });
	streamEvent?.({ type: 'run_state', state: 'thinking', label: 'Thinking' });

	try {
		for (let iter = 0; iter < maxIterations; iter++) {
			if (signal?.aborted) {
				stopReason = 'cancelled';
				break;
			}

			const iterStart = Date.now();
			let text = '';
			const blocks: AgentContentBlock[] = [];
			const reasoningBlocks: AgentContentBlock[] = [];
			const pending = new Map<string, { name: string; argsStr: string }>();
			let turnStop = 'end_turn';
			let iterUsage: Usage = { inputTokens: 0, outputTokens: 0 };

			try {
				await fireLlmInputHook({
					...hookContext,
					messages: session.transcript,
					systemPrompt: systemPromptForTurn,
				});
				for await (const event of provider.stream({
					model,
					effort,
					system: systemPromptForTurn,
					messages: session.transcript,
					tools: toolsForPrompt.map((t) => ({
						name: t.name,
						description: t.description,
						schema: t.schema,
					})),
					maxTokens,
					signal,
				})) {
					switch (event.type) {
						case 'reasoning_item':
							reasoningBlocks.push({
								type: 'reasoning',
								provider: event.provider ?? 'openai',
								item: event.item,
							});
							break;
						case 'text_delta':
							firstTokenLatencyMs ??= Date.now() - runStart;
							if (!didStartAnswering) {
								didStartAnswering = true;
								streamEvent?.({ type: 'run_state', state: 'answering', label: 'Answering' });
							}
							text += event.text;
							streamOutput?.(event.text);
							streamEvent?.({ type: 'text_delta', delta: event.text });
							break;
						case 'tool_call_start':
							pending.set(event.id, { name: event.name, argsStr: '' });
							streamEvent?.({ type: 'run_state', state: 'using_tools', label: 'Using tools' });
							streamEvent?.({
								type: 'tool_call_start',
								iteration: iter,
								toolCallId: event.id,
								toolName: event.name,
							});
							break;
						case 'tool_call_args_delta': {
							const t = pending.get(event.id);
							if (t) {
								t.argsStr += event.jsonDelta;
								streamEvent?.({
									type: 'tool_call_args_delta',
									iteration: iter,
									toolCallId: event.id,
									toolName: t.name,
									jsonDelta: event.jsonDelta,
									argsText: t.argsStr,
								});
							}
							break;
						}
						case 'tool_call_end': {
							const t = pending.get(event.id);
							if (t) {
								streamEvent?.({
									type: 'tool_call_input',
									iteration: iter,
									toolCallId: event.id,
									toolName: t.name,
									input: parseToolArgs(t.argsStr, { __unparsed: t.argsStr }),
									argsText: t.argsStr,
								});
							}
							break;
						}
						case 'message_end':
							turnStop = event.stopReason;
							iterUsage = event.usage;
							totalUsage.inputTokens += event.usage.inputTokens;
							totalUsage.outputTokens += event.usage.outputTokens;
							break;
					}
				}
				await fireLlmOutputHook({
					...hookContext,
					stopReason: turnStop,
					outputTokens: iterUsage.outputTokens,
				});
			} catch (err) {
				if (err instanceof ContextOverflowError && !didCompact) {
					didCompact = true;
					agentLogger.warn('agent:run', 'context overflow, compacting', { runId, iter });
					await flushSessionMemoryBeforeCompaction(session, ctx.workspace).catch(() => undefined);
					const { transcript: next, marker } = await compact(
						session.id,
						session.transcript,
						provider,
						model,
						effort,
						{
							runId,
							agentId: ctx.agentId,
							sessionKey: ctx.sessionId,
							providerId: input.providerId,
							requestedRuntime: input.requestedRuntime,
							storedRuntime: input.storedRuntime,
						}
					);
					session.transcript = next;
					if (marker) session.compactionMarkers.push(marker);
					iter--;
					continue;
				}
				if ((err as Error).name === 'AbortError') {
					stopReason = 'cancelled';
					agentLogger.info('agent:run', 'run aborted', { runId, iter });
					break;
				}
				stopReason = 'error';
				finalText += `\n[error: ${(err as Error).message}]`;
				agentLogger.error('agent:run', 'stream error', { runId, iter, error: (err as Error).message });
				await hooks?.onFinish?.({
					runId,
					stopReason,
					usage: totalUsage,
					iterations: Math.max(completedIterations, iter + 1),
					durationMs: Date.now() - runStart,
					outputChars: finalText.length,
					firstTokenLatencyMs,
					error: err as Error,
				});
				await fireAgentEndOnce();
				throw err;
			}

			completedIterations = iter + 1;
			await hooks?.onIteration?.({
				runId,
				iteration: iter,
				usage: iterUsage,
				durationMs: Date.now() - iterStart,
			});

			blocks.push(...reasoningBlocks);
			if (text) blocks.push({ type: 'text', text });
			for (const [id, t] of pending) {
				const parsed = parseToolArgs(t.argsStr, { __unparsed: t.argsStr });
				blocks.push({ type: 'tool_use', toolUseId: id, toolName: t.name, toolArgs: parsed });
			}
			if (!blocks.some(isVisibleAssistantBlock)) blocks.push({ type: 'text', text: '' });
			await fireBeforeMessageWriteHook({
				...hookContext,
				role: 'assistant',
				content: assistantBlocksToHookText(blocks),
				sessionKey: hookContext.sessionKey,
			});
			session.transcript.push({ role: 'assistant', content: blocks });
			finalText += text;

			if (pending.size === 0) {
				stopReason = turnStop === 'max_tokens' ? 'max_tokens' : 'end_turn';
				break;
			}

			for (const [id, t] of pending) {
				if (signal?.aborted) {
					stopReason = 'cancelled';
					break;
				}
				toolCalls++;
				const tool = toolsForPrompt.find((x) => x.name === t.name);
				const parsedArgs = parseToolArgsForExecution(t.name, t.argsStr);
				const args = parsedArgs.args;
				streamEvent?.({
					type: 'tool_call_input',
					iteration: iter,
					toolCallId: id,
					toolName: t.name,
					input: args,
					argsText: t.argsStr,
				});
				const toolStart = Date.now();
				if (!parsedArgs.ok) {
					const toolResult = await prepareToolResultForRun({
						content: [{ type: 'text', text: parsedArgs.message }],
						hookContext,
						runtime: harnessRuntime,
					});
					const durationMs = Date.now() - toolStart;
					await recordToolResult({
						iteration: iter,
						toolUseId: id,
						toolName: t.name,
						args,
						status: 'error',
						durationMs,
						toolResult,
						isError: true,
					});
					agentLogger.warn('agent:run', 'tool args invalid', { runId, tool: t.name, iter, durationMs });
					continue;
				}
				if (!tool) {
					const toolResult = await prepareToolResultForRun({
						content: [{ type: 'text', text: `tool '${t.name}' is not available in this run.` }],
						hookContext,
						runtime: harnessRuntime,
					});
					const durationMs = Date.now() - toolStart;
					await recordToolResult({
						iteration: iter,
						toolUseId: id,
						toolName: t.name,
						args,
						status: 'error',
						durationMs,
						toolResult,
						isError: true,
					});
					agentLogger.warn('agent:run', 'tool not found', { runId, tool: t.name, iter });
					continue;
				}
				const before = await toolService.beforeCall(tool, args, ctx, tracker);
				if (!before.proceed && before.vetoResult) {
					const status: ToolResultStatus = before.vetoStatus ?? 'error';
					const vetoResult = sanitizeToolResultDetails(before.vetoResult);
					const toolResult = await prepareToolResultForRun({
						content: vetoResult.content,
						details: vetoResult.details,
						hookContext,
						runtime: harnessRuntime,
					});
					const durationMs = Date.now() - toolStart;
					await recordToolResult({
						iteration: iter,
						toolUseId: id,
						toolName: t.name,
						args,
						status,
						durationMs,
						toolResult,
						isError: true,
					});
					continue;
				}
				let res;
				try {
					res = await toolService.executeToolWithManagement(
						tool,
						args as Record<string, unknown>,
						ctx,
						toolManagement
					);
				} catch (err) {
					agentLogger.error('agent:run', 'tool threw', { runId, tool: t.name, iter, error: (err as Error).message });
					res = {
						status: 'error' as const,
						content: [
							{ type: 'text' as const, text: `tool ${t.name} threw: ${(err as Error).message}` },
						],
					};
				}
				const sanitizedResult = sanitizeToolResultDetails(res);
				const rawContent = before.warning
					? [...sanitizedResult.content, { type: 'text' as const, text: before.warning }]
					: sanitizedResult.content;
				const toolResult = await prepareToolResultForRun({
					content: rawContent,
					details: sanitizedResult.details,
					hookContext,
					runtime: harnessRuntime,
				});
				const durationMs = Date.now() - toolStart;
				const status: ToolResultStatus =
					sanitizedResult.status === 'ok'
					? 'ok'
					: sanitizedResult.status === 'rejected'
							? 'rejected'
							: 'error';
				await recordToolResult({
					iteration: iter,
					toolUseId: id,
					toolName: t.name,
					args,
					status,
					durationMs,
					toolResult,
				});
				agentLogger.info('agent:run', 'tool call', { runId, tool: t.name, iter, status, durationMs, outputChars: toolResult.outputText.length });
			}

			if (iter === maxIterations - 1) stopReason = 'max_iterations';
		}
	} catch (err) {
		if ((err as Error).name === 'AbortError') {
			stopReason = 'cancelled';
		} else {
			throw err;
		}
	}

	session.plan = ctx.plan.entries;

	await fireAgentEndOnce();
	await hooks?.onFinish?.({
		runId,
		stopReason,
		usage: totalUsage,
		iterations: completedIterations,
		durationMs: Date.now() - runStart,
		outputChars: finalText.length,
		firstTokenLatencyMs,
	});
	agentLogger.info('agent:run', 'run finished', { runId, stopReason, iterations: completedIterations, inputTokens: totalUsage.inputTokens, outputTokens: totalUsage.outputTokens, durationMs: Date.now() - runStart });

	return {
		finalText,
		toolCalls,
		usage: totalUsage,
		stopReason,
		session,
	};
}
