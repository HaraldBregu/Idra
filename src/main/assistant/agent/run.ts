import type { AssistantContentBlock, Usage } from '../provider/types';
import { ContextOverflowError } from '../provider/types';
import type { ProviderAdapter } from '../provider/types';
import type { AgentTool, ToolContext } from '../tools/types';
import { beforeToolCall, newCallTracker } from '../tools/before-call';
import { compact } from './compaction';
import type { SessionFile } from '../session/store';

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
	}) => void | Promise<void>;
	onFinish?: (info: {
		runId: string;
		stopReason: AgentRunResult['stopReason'];
		usage: Usage;
		iterations: number;
		durationMs: number;
		error?: Error;
	}) => void | Promise<void>;
}

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
	hooks?: AgentRunHooks;
	signal?: AbortSignal;
}

export interface AgentRunResult {
	finalText: string;
	toolCalls: number;
	usage: Usage;
	stopReason: 'end_turn' | 'max_tokens' | 'max_iterations' | 'error' | 'cancelled';
	session: SessionFile;
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
		hooks,
		signal,
	} = input;

	session.transcript.push({ role: 'user', content: userMessage });

	const tracker = newCallTracker();
	const totalUsage: Usage = { inputTokens: 0, outputTokens: 0 };
	let finalText = '';
	let toolCalls = 0;
	let stopReason: AgentRunResult['stopReason'] = 'end_turn';
	let didCompact = false;
	const runStart = Date.now();

	await hooks?.onStart?.({ runId });

	try {
		for (let iter = 0; iter < maxIterations; iter++) {
			if (signal?.aborted) {
				stopReason = 'cancelled';
				break;
			}

			let text = '';
			const blocks: AssistantContentBlock[] = [];
			const pending = new Map<string, { name: string; argsStr: string }>();
			let turnStop = 'end_turn';
			const iterStart = Date.now();
			let iterUsage: Usage = { inputTokens: 0, outputTokens: 0 };

			try {
				for await (const event of provider.stream({
					model,
					system: systemPrompt,
					messages: session.transcript,
					tools: tools.map((t) => ({
						name: t.name,
						description: t.description,
						schema: t.schema,
					})),
					maxTokens,
					signal,
				})) {
					switch (event.type) {
						case 'text_delta':
							text += event.text;
							streamOutput?.(event.text);
							break;
						case 'tool_call_start':
							pending.set(event.id, { name: event.name, argsStr: '' });
							break;
						case 'tool_call_args_delta': {
							const t = pending.get(event.id);
							if (t) t.argsStr += event.jsonDelta;
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
					iterations: iter,
					durationMs: Date.now() - runStart,
					error: err as Error,
				});
				throw err;
			}

			await hooks?.onIteration?.({ runId, iteration: iter, usage: iterUsage });

			if (text) blocks.push({ type: 'text', text });
			for (const [id, t] of pending) {
				let parsed: unknown = {};
				if (t.argsStr.trim()) {
					try {
						parsed = JSON.parse(t.argsStr);
					} catch {
						parsed = { __unparsed: t.argsStr };
					}
				}
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
				const tool = tools.find((x) => x.name === t.name);
				let args: unknown = {};
				try {
					args = t.argsStr.trim() ? JSON.parse(t.argsStr) : {};
				} catch {
					args = {};
				}
				const toolStart = Date.now();
				if (!tool) {
					const out = `tool '${t.name}' is not available in this run.`;
					await hooks?.onToolCall?.({
						runId,
						iteration: iter,
						callId: id,
						tool: t.name,
						args,
						status: 'error',
						durationMs: Date.now() - toolStart,
						outputChars: out.length,
					});
					session.transcript.push({
						role: 'tool',
						toolUseId: id,
						isError: true,
						content: [{ type: 'text', text: out }],
					});
					continue;
				}
				const before = await beforeToolCall(tool, args, ctx, tracker);
				if (!before.proceed && before.vetoResult) {
					const outText = before.vetoResult.content
						.map((c) => (c.type === 'text' ? (c.text ?? '') : ''))
						.join(' ');
					await hooks?.onToolCall?.({
						runId,
						iteration: iter,
						callId: id,
						tool: t.name,
						args,
						status: 'rejected',
						durationMs: Date.now() - toolStart,
						outputChars: outText.length,
					});
					session.transcript.push({
						role: 'tool',
						toolUseId: id,
						isError: before.vetoResult.status === 'error',
						content: before.vetoResult.content,
					});
					continue;
				}
				let res;
				try {
					res = await tool.execute(args as Record<string, unknown>, ctx);
				} catch (err) {
					res = {
						status: 'error' as const,
						content: [{ type: 'text' as const, text: `tool ${t.name} threw: ${(err as Error).message}` }],
					};
				}
				const content = before.warning
					? [...res.content, { type: 'text' as const, text: before.warning }]
					: res.content;
				const outText = content.map((c) => (c.type === 'text' ? (c.text ?? '') : '')).join(' ');
				await hooks?.onToolCall?.({
					runId,
					iteration: iter,
					callId: id,
					tool: t.name,
					args,
					status: res.status === 'ok' ? 'ok' : 'error',
					durationMs: Date.now() - toolStart,
					outputChars: outText.length,
				});
				session.transcript.push({
					role: 'tool',
					toolUseId: id,
					isError: res.status === 'error',
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
		iterations: 0,
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
