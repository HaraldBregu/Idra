import type { ProviderAdapter, TranscriptEntry, Usage } from '../provider/types';
import type { AgentResponseEvent } from '../../shared/agents/events';
import type { AgentRunStopReason } from '../../shared/agents/constants';
import type { AgentTool, ToolContext, ToolServicePort } from './tools';
import { ToolService } from './tools';
import type { SessionFile } from './session/store';

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
		const transcript: TranscriptEntry[] = [...input.session.transcript, { role: 'user', content: input.message }];
		const pending = new Map<string, { name: string; argsText: string }>();
		let stopReason: AgentRunStopReason = 'end_turn';

		for await (const event of input.providerAdapter.stream({
			model: input.model,
			effort: input.effort as never,
			system: input.systemPrompt,
			messages: transcript,
			tools: input.tools.map((tool) => ({ name: tool.name, description: tool.description, schema: tool.schema })),
			maxTokens: input.maxTokens ?? 4096,
			signal: input.signal,
		})) {
			if (event.type === 'text_delta') {
				finalText += event.text;
				input.hooks?.streamEvent?.({ type: 'text_delta', text: event.text } as AgentResponseEvent);
			} else if (event.type === 'tool_call_start') {
				pending.set(event.id, { name: event.name, argsText: '' });
			} else if (event.type === 'tool_call_args_delta') {
				const call = pending.get(event.id);
				if (call) call.argsText += event.jsonDelta;
			} else if (event.type === 'message_end') {
				usage.inputTokens += event.usage.inputTokens;
				usage.outputTokens += event.usage.outputTokens;
				stopReason = event.stopReason === 'max_tokens' ? 'max_tokens' : 'end_turn';
			}
		}

		const assistantBlocks = finalText ? [{ type: 'text' as const, text: finalText }] : [];
		for (const [id, call] of pending) {
			toolCalls++;
			const args = parseArgs(call.argsText);
			assistantBlocks.push({ type: 'tool_use' as const, toolUseId: id, toolName: call.name, toolArgs: args });
			const tool = input.tools.find((entry) => entry.name === call.name);
			const result = tool
				? await this.toolService.executeToolWithManagement(tool, args, input.ctx, {})
				: { status: 'error' as const, content: [{ type: 'text' as const, text: `tool ${call.name} not found` }] };
			transcript.push({ role: 'tool', toolUseId: id, status: result.status, isError: result.status !== 'ok', content: result.content });
		}
		transcript.push({ role: 'assistant', content: assistantBlocks });
		return {
			finalText,
			toolCalls,
			usage,
			stopReason,
			session: { ...input.session, transcript, updatedAt: new Date().toISOString() },
		};
	}
}

function parseArgs(text: string): Record<string, unknown> {
	if (!text.trim()) return {};
	try {
		const parsed = JSON.parse(text) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed };
	} catch {
		return { __unparsed: text };
	}
}
