import { ContextOverflowError } from '../../llm/types';
import type { AgentContentBlock, ProviderAdapter, ToolResultBlock, Usage } from '../../llm/types';
import type { AgentTool } from '../tooling';
import { createAgentToolController } from '../tools';
import { compact } from '../context/compaction';
import { agentLogger } from '../logger';
import { flushSessionMemoryBeforeCompaction } from '../../memory/runtime';
import type { ModelReasoningEffort } from '../../../shared/agents/service';
import { makeProvider } from '../../llm/router';
import type { AgentToolResultStatus } from '../../../shared/agents/events';
import type {
	AgentExecutionServicePort,
	AgentRunInput,
	AgentRunResult,
	AgentToolControllerPort,
} from './types';

export type {
	AgentExecutionServicePort,
	AgentProviderLookup,
	AgentRunInput,
	AgentRunResult,
	AgentRunStreamEvent,
} from './types';

export class AgentExecutionService implements AgentExecutionServicePort {
	constructor(
		private readonly toolController: AgentToolControllerPort = createAgentToolController()
	) {}

	execute(input: AgentRunInput): Promise<AgentRunResult> {
		return executeAgentRun({
			...input,
			toolController: input.toolController ?? this.toolController,
		});
	}
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
):
	| { ok: true; args: Record<string, unknown> }
	| { ok: false; args: Record<string, unknown>; message: string } {
	if (!argsStr.trim()) return { ok: true, args: {} };
	try {
		const parsed = JSON.parse(argsStr);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return { ok: true, args: parsed as Record<string, unknown> };
		}
		return {
			ok: false,
			args: { __parsed: parsed },
			message: `Invalid arguments for ${toolName}: tool arguments must be a JSON object. The tool was not executed.`,
		};
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

function formatProviderToolError(error: unknown): string {
	if (error === undefined || error === null) return '';
	if (typeof error === 'string') return error;
	if (error instanceof Error) return error.message;
	if (typeof error !== 'object') return String(error);

	const record = error as Record<string, unknown>;
	const message = typeof record.message === 'string' ? record.message : '';
	const type = typeof record.type === 'string' ? record.type : '';
	const code =
		typeof record.code === 'string' || typeof record.code === 'number'
			? String(record.code)
			: '';
	const prefix = [type, code].filter(Boolean).join(' ');
	if (message) return prefix ? `${prefix}: ${message}` : message;

	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

function toolResultOutput(content: ToolResultBlock[], details?: unknown): unknown {
	return details === undefined ? resultBlocksToOutput(content) : details;
}

async function prepareToolResultForRun(params: {
	content: ToolResultBlock[];
	details?: unknown;
}): Promise<{ content: ToolResultBlock[]; outputText: string; output: unknown }> {
	const outputText = resultBlocksToText(params.content);
	return {
		content: params.content,
		outputText,
		output: toolResultOutput(params.content, params.details),
	};
}

function resolveProviderAndModel(input: AgentRunInput): {
	provider: ProviderAdapter;
	model: string;
	effort: ModelReasoningEffort | undefined;
} {
	if (input.provider && input.model) {
		return { provider: input.provider, model: input.model, effort: input.effort };
	}
	const store = input.store;
	if (!store) {
		throw new Error('provider and model are required when no store is provided.');
	}
	const selection = store.getAgentService();
	if (!selection) throw new Error('Agent provider not configured.');
	const providerId = selection.provider.id.trim().toLowerCase();
	const model = input.model?.trim() || selection.model.id.trim() || selection.model.name.trim();
	if (!model) throw new Error('Agent model not configured.');
	const providerConfig = store.getProviderById(providerId);
	if (!providerConfig) throw new Error(`Provider not configured: ${providerId}`);
	const apiKey = providerConfig.apiKey.trim();
	if (!apiKey) throw new Error(`API key missing for provider: ${providerId}`);
	const factory = input.providerFactory ?? makeProvider;
	const provider =
		input.provider ?? factory({ id: providerId, apiKey, baseURL: providerConfig.baseUrl });
	const effort = input.effort ?? selection.model.effort;
	return { provider, model, effort };
}

function toolServiceKind(tool: AgentTool): 'tool' | 'connector' | 'mcp' {
	return tool.serviceKind ?? 'tool';
}

function toolDisplayName(tool: AgentTool): string | undefined {
	return tool.displayName ?? tool.displaySummary;
}

export async function executeAgentRun(input: AgentRunInput): Promise<AgentRunResult> {
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
		signal,
	} = input;

	const toolController = input.toolController ?? createAgentToolController();
	const executionCtx = ctx;
	const toolPreparation = toolController.prepareRun({
		tools,
		ctx: executionCtx,
		userMessage,
		providerId: input.providerId,
		model,
		management: input.toolManagement,
	});
	const toolManagement = toolPreparation.management;
	const tracker = toolPreparation.tracker;
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

	const recordToolResult = async (params: {
		iteration: number;
		toolUseId: string;
		tool: AgentTool;
		args: unknown;
		status: AgentToolResultStatus;
		durationMs: number;
		toolResult: Awaited<ReturnType<typeof prepareToolResultForRun>>;
		isError?: boolean;
	}): Promise<void> => {
		const isError = params.isError ?? params.status !== 'ok';
		const toolResult = await prepareToolResultForRun({
			content: params.toolResult.content,
		});
		streamEvent?.({
			type: 'tool_call_result',
			iteration: params.iteration,
			toolCallId: params.toolUseId,
			toolName: params.tool.name,
			name: params.tool.name,
			displayName: toolDisplayName(params.tool),
			serviceKind: toolServiceKind(params.tool),
			serviceId: params.tool.serviceId,
			input: params.args,
			output: toolResult.output,
			outputText: toolResult.outputText,
			status: params.status,
			durationMs: params.durationMs,
			errorText: params.status !== 'ok' ? toolResult.outputText : undefined,
		});
		session.transcript.push({
			role: 'tool',
			toolUseId: params.toolUseId,
			isError,
			status: params.status,
			content: toolResult.content,
		});
	};

	session.transcript.push({ role: 'user', content: userMessage });

	agentLogger.info('agent:run', 'run started', {
		runId,
		model,
		tools: tools.map((t) => t.name),
		userMessageLen: userMessage.length,
	});
	streamEvent?.({ type: 'run_state', state: 'thinking', label: 'Thinking' });

	try {
		for (let iter = 0; iter < maxIterations; iter++) {
			if (signal?.aborted) {
				stopReason = 'cancelled';
				break;
			}

			let text = '';
			const blocks: AgentContentBlock[] = [];
			const providerBlocks: AgentContentBlock[] = [];
			const mcpOutputFallbacks: string[] = [];
			const reasoningBlocks: AgentContentBlock[] = [];
			const pending = new Map<string, { name: string; argsStr: string; tool?: AgentTool }>();
			let turnStop = 'end_turn';
			let reasoningStarted = false;
			let approvalBlocked = false;
			const reasoningSummaryId = `${runId}:${iter}:reasoning`;

			try {
				const request = {
					model,
					effort,
					system: systemPromptForTurn,
					messages: session.transcript,
					tools: toolsForPrompt.map((t) => ({
						name: t.name,
						description: t.description,
						schema: t.schema,
					})),
					builtInTools: input.builtInTools ?? [],
					maxTokens,
					signal,
				};
				providerEvents: for await (const event of provider.stream(request)) {
						switch (event.type) {
							case 'reasoning_item':
								reasoningBlocks.push({
									type: 'reasoning',
									provider: event.provider ?? 'openai',
									item: event.item,
								});
								if (!reasoningStarted) {
									reasoningStarted = true;
									streamEvent?.({ type: 'run_state', state: 'reasoning', label: 'Reasoning' });
									streamEvent?.({
										type: 'reasoning_summary',
										id: reasoningSummaryId,
										title: 'Reasoning',
										summary: 'The model is using reasoning for this turn.',
										state: 'running',
									});
								}
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
							case 'tool_call_start': {
								const tool =
									toolsForPrompt.find((entry) => entry.name === event.name) ??
									tools.find((entry) => entry.name === event.name);
								pending.set(event.id, { name: event.name, argsStr: '', tool });
								streamEvent?.({ type: 'run_state', state: 'using_tools', label: 'Using tools' });
								streamEvent?.({
									type: 'tool_call_start',
									iteration: iter,
									toolCallId: event.id,
									toolName: event.name,
									name: event.name,
									displayName: tool ? toolDisplayName(tool) : undefined,
									serviceKind: tool ? toolServiceKind(tool) : 'tool',
									serviceId: tool?.serviceId,
								});
								break;
							}
							case 'tool_call_args_delta': {
								const t = pending.get(event.id);
								if (t) {
									t.argsStr += event.jsonDelta;
									streamEvent?.({
										type: 'tool_call_args_delta',
										iteration: iter,
										toolCallId: event.id,
										toolName: t.name,
										name: t.name,
										displayName: t.tool ? toolDisplayName(t.tool) : undefined,
										serviceKind: t.tool ? toolServiceKind(t.tool) : 'tool',
										serviceId: t.tool?.serviceId,
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
										name: t.name,
										displayName: t.tool ? toolDisplayName(t.tool) : undefined,
										serviceKind: t.tool ? toolServiceKind(t.tool) : 'tool',
										serviceId: t.tool?.serviceId,
										input: parseToolArgs(t.argsStr, { __unparsed: t.argsStr }),
										argsText: t.argsStr,
									});
								}
								break;
							}
							case 'mcp_list_tools':
								if (event.item) {
									providerBlocks.push({
										type: 'provider_item',
										provider: 'openai',
										item: event.item,
									});
								}
								break;
							case 'mcp_approval_request': {
								const args = parseToolArgs(event.arguments, { __unparsed: event.arguments });
								const message = `OpenAI connector "${event.serverLabel}" requested approval to run "${event.name}", but this loop does not handle connector approval prompts.`;
								firstTokenLatencyMs ??= Date.now() - runStart;
								if (!didStartAnswering) {
									didStartAnswering = true;
									streamEvent?.({ type: 'run_state', state: 'answering', label: 'Answering' });
								}
								text += message;
								streamOutput?.(message);
								streamEvent?.({ type: 'text_delta', delta: message });
								streamEvent?.({ type: 'run_state', state: 'using_tools', label: 'Using tools' });
								streamEvent?.({
									type: 'tool_call_start',
									iteration: iter,
									toolCallId: event.id,
									toolName: event.name,
									name: event.name,
									displayName: `${event.serverLabel}.${event.name}`,
									serviceKind: 'mcp',
									serviceId: event.serverLabel,
								});
								streamEvent?.({
									type: 'tool_call_input',
									iteration: iter,
									toolCallId: event.id,
									toolName: event.name,
									name: event.name,
									displayName: `${event.serverLabel}.${event.name}`,
									serviceKind: 'mcp',
									serviceId: event.serverLabel,
									input: args,
									argsText: event.arguments,
								});
								streamEvent?.({
									type: 'tool_call_result',
									iteration: iter,
									toolCallId: event.id,
									toolName: event.name,
									name: event.name,
									displayName: `${event.serverLabel}.${event.name}`,
									serviceKind: 'mcp',
									serviceId: event.serverLabel,
									input: args,
									output: message,
									outputText: message,
									status: 'blocked',
									durationMs: 0,
									errorText: message,
								});
								approvalBlocked = true;
								turnStop = 'end_turn';
								break providerEvents;
							}
							case 'mcp_call': {
								if (event.item) {
									providerBlocks.push({
										type: 'provider_item',
										provider: 'openai',
										item: event.item,
									});
								}
								const args = parseToolArgs(event.arguments, { __unparsed: event.arguments });
								const errorText = formatProviderToolError(event.error);
								const outputText = event.error
									? `OpenAI MCP connector "${event.serverLabel}" failed to run "${event.name}": ${errorText}`
									: (event.output ?? '');
								streamEvent?.({ type: 'run_state', state: 'using_tools', label: 'Using tools' });
								streamEvent?.({
									type: 'tool_call_start',
									iteration: iter,
									toolCallId: event.id,
									toolName: event.name,
									name: event.name,
									displayName: `${event.serverLabel}.${event.name}`,
									serviceKind: 'mcp',
									serviceId: event.serverLabel,
								});
								streamEvent?.({
									type: 'tool_call_input',
									iteration: iter,
									toolCallId: event.id,
									toolName: event.name,
									name: event.name,
									displayName: `${event.serverLabel}.${event.name}`,
									serviceKind: 'mcp',
									serviceId: event.serverLabel,
									input: args,
									argsText: event.arguments,
								});
								streamEvent?.({
									type: 'tool_call_result',
									iteration: iter,
									toolCallId: event.id,
									toolName: event.name,
									name: event.name,
									displayName: `${event.serverLabel}.${event.name}`,
									serviceKind: 'mcp',
									serviceId: event.serverLabel,
									input: args,
									output: event.output ?? event.error ?? '',
									outputText,
									status: event.error ? 'error' : 'ok',
									durationMs: 0,
									errorText: event.error ? outputText : undefined,
								});
								if (outputText) mcpOutputFallbacks.push(outputText);
								break;
							}
							case 'message_end':
								turnStop = event.stopReason;
								totalUsage.inputTokens += event.usage.inputTokens;
								totalUsage.outputTokens += event.usage.outputTokens;
								break;
						}
					}
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
				agentLogger.error('agent:run', 'stream error', {
					runId,
					iter,
					error: (err as Error).message,
				});
				streamEvent?.({ type: 'run_finished', stopReason, outputChars: finalText.length });
				throw err;
			}

			if (reasoningStarted) {
				streamEvent?.({
					type: 'reasoning_summary',
					id: reasoningSummaryId,
					title: 'Reasoning',
					summary: 'Reasoning finished before the answer.',
					state: 'completed',
				});
			}

			completedIterations = iter + 1;

			if (!text && mcpOutputFallbacks.length > 0) {
				text = mcpOutputFallbacks.join('\n');
				firstTokenLatencyMs ??= Date.now() - runStart;
				if (!didStartAnswering) {
					didStartAnswering = true;
					streamEvent?.({ type: 'run_state', state: 'answering', label: 'Answering' });
				}
				streamOutput?.(text);
				streamEvent?.({ type: 'text_delta', delta: text });
			}

			blocks.push(...providerBlocks);
			blocks.push(...reasoningBlocks);
			if (text) blocks.push({ type: 'text', text });
			for (const [id, t] of pending) {
				const parsed = parseToolArgs(t.argsStr, { __unparsed: t.argsStr });
				blocks.push({ type: 'tool_use', toolUseId: id, toolName: t.name, toolArgs: parsed });
			}
			if (!blocks.some(isVisibleAssistantBlock)) blocks.push({ type: 'text', text: '' });
			session.transcript.push({ role: 'assistant', content: blocks });
			finalText += text;

			if (pending.size === 0) {
				stopReason = turnStop === 'max_tokens' ? 'max_tokens' : 'end_turn';
				if (approvalBlocked) stopReason = 'end_turn';
				break;
			}

			for (const [id, t] of pending) {
				if (signal?.aborted) {
					stopReason = 'cancelled';
					break;
				}
				toolCalls++;
				const tool =
					toolsForPrompt.find((x) => x.name === t.name) ?? tools.find((x) => x.name === t.name);
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
					const fallbackTool = tool ?? unknownTool(t.name);
					const toolResult = await prepareToolResultForRun({
						content: [{ type: 'text', text: parsedArgs.message }],
					});
					await recordToolResult({
						iteration: iter,
						toolUseId: id,
						tool: fallbackTool,
						args,
						status: 'error',
						durationMs: Date.now() - toolStart,
						toolResult,
						isError: true,
					});
					agentLogger.warn('agent:run', 'tool args invalid', { runId, tool: t.name, iter });
					continue;
				}
				if (!tool) {
					const fallbackTool = unknownTool(t.name);
					const toolResult = await prepareToolResultForRun({
						content: [{ type: 'text', text: `tool '${t.name}' is not available in this run.` }],
					});
					await recordToolResult({
						iteration: iter,
						toolUseId: id,
						tool: fallbackTool,
						args,
						status: 'error',
						durationMs: Date.now() - toolStart,
						toolResult,
						isError: true,
					});
					agentLogger.warn('agent:run', 'tool not found', { runId, tool: t.name, iter });
					continue;
				}
				let res;
				let status: AgentToolResultStatus;
				try {
					const executed = await toolController.execute({
						tool,
						args,
						ctx: executionCtx,
						tracker,
						management: toolManagement,
					});
					res = executed.result;
					status = executed.status;
				} catch (err) {
					agentLogger.error('agent:run', 'tool threw', {
						runId,
						tool: t.name,
						iter,
						error: (err as Error).message,
					});
					res = {
						status: 'error' as const,
						content: [
							{ type: 'text' as const, text: `tool ${t.name} threw: ${(err as Error).message}` },
						],
					};
					status = 'error';
				}
				const toolResult = await prepareToolResultForRun({
					content: res.content,
					details: res.details,
				});
				await recordToolResult({
					iteration: iter,
					toolUseId: id,
					tool,
					args,
					status,
					durationMs: Date.now() - toolStart,
					toolResult,
				});
				agentLogger.info('agent:run', 'tool call', {
					runId,
					tool: t.name,
					iter,
					status,
					outputChars: toolResult.outputText.length,
				});
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

	streamEvent?.({ type: 'run_finished', stopReason, outputChars: finalText.length });
	agentLogger.info('agent:run', 'run finished', {
		runId,
		stopReason,
		iterations: completedIterations,
		inputTokens: totalUsage.inputTokens,
		outputTokens: totalUsage.outputTokens,
		durationMs: Date.now() - runStart,
	});

	return {
		finalText,
		toolCalls,
		usage: totalUsage,
		stopReason,
		session,
	};
}

function unknownTool(name: string): AgentTool {
	return {
		name,
		description: 'Unavailable tool placeholder.',
		schema: { type: 'object', properties: {} },
		serviceKind: 'tool',
		execute: async () => ({
			status: 'error',
			content: [{ type: 'text', text: 'tool is unavailable' }],
		}),
	};
}
