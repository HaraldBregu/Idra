import type { AgentContentBlock, ProviderAdapter, TranscriptEntry, ToolResultBlock, Usage } from '../../provider/types';
import type { AgentResponseEvent, AgentRunStreamEvent as SharedAgentRunStreamEvent } from '../../../shared/agents/events';
import type { AgentRunStopReason } from '../../../shared/agents/constants';
import type { AgentTool, ToolContext, ToolServicePort } from '../capabilities/local';
import { ToolService } from '../capabilities/local';
import type { SessionFile } from '../context/session/store';
import { providerSafeToolName } from '../capabilities/local/tool-definition-adapter';

const DEFAULT_MAX_ITERATIONS = 25;

export interface AgentRunHooks {
	streamEvent?: (event: AgentResponseEvent) => void;
}

export interface AgentRunInput {
	runId: string;
	providerAdapter: ProviderAdapter;
	model: string;
	effort?: string;
	systemPrompt: string;
	session: SessionFile;
	tools: AgentTool[];
	ctx: ToolContext;
	message: string;
	maxTokens?: number;
	maxIterations?: number;
	signal?: AbortSignal;
	hooks?: AgentRunHooks;
}

export interface AgentRunResult {
	finalText: string;
	toolCalls: number;
	usage: Usage;
	stopReason: AgentRunStopReason;
	session: SessionFile;
}

export type AgentRunStreamEvent = AgentResponseEvent;

export interface AgentExecutionServicePort {
	run(input: AgentRunInput): Promise<AgentRunResult>;
}

export class AgentExecutionService implements AgentExecutionServicePort {
	constructor(private readonly toolService: ToolServicePort = new ToolService()) {}

	async run(input: AgentRunInput): Promise<AgentRunResult> {
		let finalText = '';
		let toolCalls = 0;
		const usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let transcript: TranscriptEntry[] = [...input.session.transcript, { role: 'user', content: input.message }];
		let stopReason: AgentRunStopReason = 'max_iterations';
		const toolBindings = bindTools(input.tools);
		const tracker = this.toolService.createCallTracker();

		for (let iteration = 0; iteration < (input.maxIterations ?? DEFAULT_MAX_ITERATIONS); iteration++) {
			const pending = new Map<string, { name: string; argsText: string }>();
			const assistantBlocks: AgentContentBlock[] = [];
			let turnText = '';
			let providerStopReason = 'end_turn';

			for await (const event of input.providerAdapter.stream({
				model: input.model,
				effort: input.effort as never,
				system: input.systemPrompt,
				messages: transcript,
				tools: toolBindings.definitions,
				maxTokens: input.maxTokens ?? 4096,
				signal: input.signal,
			})) {
				if (event.type === 'text_delta') {
					turnText += event.text;
					finalText += event.text;
					this.emit(input, { type: 'text_delta', delta: event.text });
				} else if (event.type === 'tool_call_start') {
					pending.set(event.id, { name: event.name, argsText: '' });
					const tool = toolBindings.byProviderName.get(event.name);
					this.emit(input, toolEvent('tool_call_start', iteration, event.id, event.name, tool));
				} else if (event.type === 'tool_call_args_delta') {
					const call = pending.get(event.id);
					if (call) call.argsText += event.jsonDelta;
					this.emit(input, { type: 'tool_call_args_delta', iteration, toolCallId: event.id, toolName: call?.name ?? 'unknown', jsonDelta: event.jsonDelta, argsText: call?.argsText ?? event.jsonDelta });
				} else if (event.type === 'message_end') {
					usage.inputTokens += event.usage.inputTokens;
					usage.outputTokens += event.usage.outputTokens;
					providerStopReason = event.stopReason;
				}
			}

			if (turnText) assistantBlocks.push({ type: 'text', text: turnText });
			for (const [id, call] of pending) {
				const parsed = parseArgs(call.argsText);
				assistantBlocks.push({ type: 'tool_use', toolUseId: id, toolName: call.name, toolArgs: parsed.args });
			}
			transcript = [...transcript, { role: 'assistant', content: assistantBlocks.length ? assistantBlocks : [{ type: 'text', text: '' }] }];

			if (pending.size === 0) {
				stopReason = providerStopReason === 'max_tokens' ? 'max_tokens' : 'end_turn';
				break;
			}

			for (const [id, call] of pending) {
				toolCalls++;
				const parsed = parseArgs(call.argsText);
				const tool = toolBindings.byProviderName.get(call.name);
				this.emit(input, { type: 'tool_call_input', iteration, toolCallId: id, toolName: call.name, input: parsed.args, argsText: call.argsText });
				const started = Date.now();
				const result = await this.executeTool(tool, parsed, input.ctx, tracker);
				this.emit(input, {
					...toolEvent('tool_call_result', iteration, id, call.name, tool),
					input: parsed.args,
					output: eventOutput(result.content),
					outputText: outputText(result.content),
					status: result.status,
					durationMs: Date.now() - started,
					...(result.status !== 'ok' ? { errorText: outputText(result.content) } : {}),
				});
				transcript = [...transcript, { role: 'tool', toolUseId: id, status: result.status, isError: result.status !== 'ok', content: result.content }];
			}
		}
		return {
			finalText,
			toolCalls,
			usage,
			stopReason,
			session: { ...input.session, transcript, updatedAt: new Date().toISOString() },
		};
	}

	private async executeTool(tool: AgentTool | undefined, parsed: ParsedArgs, ctx: ToolContext, tracker: ReturnType<ToolServicePort['createCallTracker']>) {
		if (!tool) return { status: 'error' as const, content: [{ type: 'text' as const, text: 'tool not found' }] };
		if (parsed.error) return { status: 'error' as const, content: [{ type: 'text' as const, text: parsed.error }] };
		const access = await this.toolService.beforeCall(tool, parsed.args, ctx, tracker);
		if (access.allowed === false) return { status: 'blocked' as const, content: [{ type: 'text' as const, text: access.reason ?? 'Tool is blocked.' }] };
		try {
			return await this.toolService.executeToolWithManagement(tool, parsed.args, ctx, {});
		} catch (error) {
			return { status: 'error' as const, content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }] };
		}
	}

	private emit(input: AgentRunInput, event: SharedAgentRunStreamEvent): void {
		input.hooks?.streamEvent?.({ ...event, agentId: input.ctx.sessionId, runId: input.runId } as AgentResponseEvent);
	}
}

interface ParsedArgs {
	args: Record<string, unknown>;
	error?: string;
}

function parseArgs(text: string): ParsedArgs {
	if (!text.trim()) return { args: {} };
	try {
		const parsed = JSON.parse(text) as unknown;
		return { args: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed } };
	} catch {
		return { args: { __unparsed: text }, error: `Invalid JSON arguments: ${text}` };
	}
}

function bindTools(tools: AgentTool[]) {
	const seen = new Map<string, number>();
	const byProviderName = new Map<string, AgentTool>();
	const definitions = tools.map((tool) => {
		const base = providerSafeToolName(tool.name);
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		const name = count === 0 ? base : `${base}_${count + 1}`;
		byProviderName.set(name, tool);
		return { name, description: name === tool.name ? tool.description : `Provider-safe alias for ${tool.name}. ${tool.description}`, schema: tool.schema };
	});
	return { definitions, byProviderName };
}

function toolEvent<TType extends 'tool_call_start' | 'tool_call_result'>(type: TType, iteration: number, toolCallId: string, toolName: string, tool?: AgentTool): Extract<SharedAgentRunStreamEvent, { type: TType }> {
	return { type, iteration, toolCallId, toolName, name: toolName, serviceKind: tool?.serviceKind ?? 'tool', displayName: tool?.displayName, serviceId: tool?.serviceId } as Extract<SharedAgentRunStreamEvent, { type: TType }>;
}

function outputText(content: ToolResultBlock[]): string {
	return content.map((block) => block.type === 'text' ? block.text : '[image]').join('\n');
}

function eventOutput(content: ToolResultBlock[]): unknown {
	if (content.length === 1 && content[0]?.type === 'text') return content[0].text;
	return content;
}
