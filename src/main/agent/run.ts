import type {
	AgentContentBlock,
	ToolResultBlock,
	ToolResultStatus,
	Usage,
} from '../provider/types';
import { ContextOverflowError } from '../provider/types';
import type { ProviderAdapter } from '../provider/types';
import type { AgentTool, ToolContext } from '../tools/types';
import { beforeToolCall, newCallTracker } from '../tools/before-call';
import {
	executeAgentToolWithManagement,
	selectAgentToolsForTurn,
	ToolExecutor,
	type AgentToolManagementOptions,
} from '../tools/management';
import { compact } from './compaction';
import { flushSessionMemoryBeforeCompaction } from '../memory-runtime';
import type { SessionFile } from '../session/store';
import type { AgentRunState, ReasoningSummaryState } from '../../shared/service';

export interface AgentRunHooks {
	onStart?: (info: { runId: string }) => void | Promise<void>;
	onIteration?: (info: { runId: string; iteration: number; usage: Usage }) => void | Promise<void>;
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
	provider: ProviderAdapter;
	model: string;
	tools: AgentTool[];
	ctx: ToolContext;
	maxTokens?: number;
	maxIterations?: number;
	streamOutput?: (chunk: string) => void;
	streamEvent?: (event: AgentRunStreamEvent) => void;
	hooks?: AgentRunHooks;
	signal?: AbortSignal;
	toolManagement?: AgentToolManagementOptions;
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

/**
 * Provider-neutral agent loop.
 *
 * Streams text deltas through `streamOutput`. Tool calls go through
 * `beforeToolCall` (loop detector + approval gate). On context overflow,
 * compacts the transcript once and retries. The whole run is abortable
 * via `signal`.
 */
export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
	const {
		runId,
		userMessage,
		systemPrompt,
		session,
		provider,
		model,
		tools,
		ctx,
		maxTokens = 4096,
		maxIterations = 25,
		streamOutput,
		streamEvent,
		hooks,
		signal,
	} = input;

	session.transcript.push({ role: 'user', content: userMessage });

	const tracker = newCallTracker();
	const managedExecutor =
		input.toolManagement?.executor ??
		new ToolExecutor({ maxToolCallsPerTurn: input.toolManagement?.maxToolCallsPerTurn });
	const toolManagement: AgentToolManagementOptions = {
		...input.toolManagement,
		executor: managedExecutor,
	};
	const toolSelection = selectAgentToolsForTurn(tools, userMessage, ctx, toolManagement);
	const toolsForPrompt = toolSelection.toolsForPrompt;
	const systemPromptForTurn = toolSelection.systemPromptSuffix
		? `${systemPrompt}\n\n${toolSelection.systemPromptSuffix}`
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

	await hooks?.onStart?.({ runId });
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
			const pending = new Map<string, { name: string; argsStr: string }>();
			let turnStop = 'end_turn';
			let iterUsage: Usage = { inputTokens: 0, outputTokens: 0 };

			try {
				for await (const event of provider.stream({
					model,
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
			} catch (err) {
				if (err instanceof ContextOverflowError && !didCompact) {
					didCompact = true;
					await flushSessionMemoryBeforeCompaction(session, ctx.workspace).catch(() => undefined);
					const { transcript: next, marker } = await compact(
						session.id,
						session.transcript,
						provider,
						model
					);
					session.transcript = next;
					if (marker) session.compactionMarkers.push(marker);
					iter--;
					continue;
				}
				if ((err as Error).name === 'AbortError') {
					stopReason = 'cancelled';
					break;
				}
				stopReason = 'error';
				finalText += `\n[error: ${(err as Error).message}]`;
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
				throw err;
			}

			completedIterations = iter + 1;
			await hooks?.onIteration?.({
				runId,
				iteration: iter,
				usage: iterUsage,
				durationMs: Date.now() - iterStart,
			});

			if (text) blocks.push({ type: 'text', text });
			for (const [id, t] of pending) {
				const parsed = parseToolArgs(t.argsStr, { __unparsed: t.argsStr });
				blocks.push({ type: 'tool_use', toolUseId: id, toolName: t.name, toolArgs: parsed });
			}
			if (blocks.length === 0) blocks.push({ type: 'text', text: '' });
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
					const out = parsedArgs.message;
					const durationMs = Date.now() - toolStart;
					await hooks?.onToolCall?.({
						runId,
						iteration: iter,
						callId: id,
						tool: t.name,
						args,
						status: 'error',
						durationMs,
						outputChars: out.length,
						outputText: out,
					});
					streamEvent?.({
						type: 'tool_call_result',
						iteration: iter,
						toolCallId: id,
						toolName: t.name,
						input: args,
						output: out,
						outputText: out,
						status: 'error',
						durationMs,
						errorText: out,
					});
					session.transcript.push({
						role: 'tool',
						toolUseId: id,
						isError: true,
						status: 'error',
						content: [{ type: 'text', text: out }],
					});
					continue;
				}
				if (!tool) {
					const out = `tool '${t.name}' is not available in this run.`;
					const durationMs = Date.now() - toolStart;
					await hooks?.onToolCall?.({
						runId,
						iteration: iter,
						callId: id,
						tool: t.name,
						args,
						status: 'error',
						durationMs,
						outputChars: out.length,
						outputText: out,
					});
					streamEvent?.({
						type: 'tool_call_result',
						iteration: iter,
						toolCallId: id,
						toolName: t.name,
						input: args,
						output: out,
						outputText: out,
						status: 'error',
						durationMs,
						errorText: out,
					});
					session.transcript.push({
						role: 'tool',
						toolUseId: id,
						isError: true,
						status: 'error',
						content: [{ type: 'text', text: out }],
					});
					continue;
				}
				const before = await beforeToolCall(tool, args, ctx, tracker);
				if (!before.proceed && before.vetoResult) {
					const status: ToolResultStatus = before.vetoStatus ?? 'error';
					const outText = before.vetoResult.content
						.map((c) => (c.type === 'text' ? (c.text ?? '') : ''))
						.join(' ');
					const durationMs = Date.now() - toolStart;
					await hooks?.onToolCall?.({
						runId,
						iteration: iter,
						callId: id,
						tool: t.name,
						args,
						status,
						durationMs,
						outputChars: outText.length,
						outputText: outText,
					});
					streamEvent?.({
						type: 'tool_call_result',
						iteration: iter,
						toolCallId: id,
						toolName: t.name,
						input: args,
						output: toolResultOutput(before.vetoResult.content, before.vetoResult.details),
						outputText: outText,
						status,
						durationMs,
						errorText: outText,
					});
					session.transcript.push({
						role: 'tool',
						toolUseId: id,
						isError: true,
						status,
						content: before.vetoResult.content,
					});
					continue;
				}
				let res;
				try {
					res = await executeAgentToolWithManagement(
						tool,
						args as Record<string, unknown>,
						ctx,
						toolManagement
					);
				} catch (err) {
					res = {
						status: 'error' as const,
						content: [
							{ type: 'text' as const, text: `tool ${t.name} threw: ${(err as Error).message}` },
						],
					};
				}
				const content = before.warning
					? [...res.content, { type: 'text' as const, text: before.warning }]
					: res.content;
				const outText = resultBlocksToText(content);
				const durationMs = Date.now() - toolStart;
				const status: ToolResultStatus = res.status === 'ok' ? 'ok' : 'error';
				await hooks?.onToolCall?.({
					runId,
					iteration: iter,
					callId: id,
					tool: t.name,
					args,
					status,
					durationMs,
					outputChars: outText.length,
					outputText: outText,
				});
				streamEvent?.({
					type: 'tool_call_result',
					iteration: iter,
					toolCallId: id,
					toolName: t.name,
					input: args,
					output: toolResultOutput(content, res.details),
					outputText: outText,
					status,
					durationMs,
					errorText: status === 'error' ? outText : undefined,
				});
				session.transcript.push({
					role: 'tool',
					toolUseId: id,
					isError: status === 'error',
					status,
					content,
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

	await hooks?.onFinish?.({
		runId,
		stopReason,
		usage: totalUsage,
		iterations: completedIterations,
		durationMs: Date.now() - runStart,
		outputChars: finalText.length,
		firstTokenLatencyMs,
	});

	return {
		finalText,
		toolCalls,
		usage: totalUsage,
		stopReason,
		session,
	};
}
