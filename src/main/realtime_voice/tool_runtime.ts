import type { RealtimeVoiceEvent, RealtimeVoiceToolEvent } from '../../shared/realtime_voice';
import type { ToolsContext } from '../agent/context';
import type { KeyedMutex } from '../agent/mutex';
import { formatToolOutput } from '../agent/runner/run_common';
import { runToolCall } from '../agent/runner/run_tool_call';
import type { Tool, ToolCall } from '../agent/types';
import { parseToolArgs } from '../shared/parse_tool_args';
import type { RealtimeVoiceAdapterEvent, RealtimeVoiceConnection } from './types';

const MAX_TOOL_CALLS = 100;
const MAX_TOOL_OUTPUT_BYTES = 2_000_000;
const MAX_PAID_TOOL_CALLS = 3;
const MAX_WEB_TOOL_CALLS = 8;
const PAID_TOOLS = new Set(['create_image', 'create_video', 'create_sound']);
const WEB_TOOLS = new Set(['search_web', 'fetch_web_page', 'use_web_browser']);

type ToolAdapterEvent = Extract<
	RealtimeVoiceAdapterEvent,
	{ type: 'tool_call_start' | 'tool_call_args_delta' | 'tool_call' }
>;

type RealtimeVoiceToolPayload = RealtimeVoiceToolEvent extends infer Event
	? Event extends RealtimeVoiceToolEvent
		? Omit<Event, 'sessionId' | 'agentId' | 'runId'>
		: never
	: never;

export interface RealtimeVoiceToolRuntimeDependencies {
	sessionId: string;
	windowId: number;
	tools: Tool[];
	signal: AbortSignal;
	resources: KeyedMutex;
	connection(): RealtimeVoiceConnection | undefined;
	emit(event: RealtimeVoiceEvent): void;
	onThinking(): void;
	onError(error: unknown): void;
}

export class RealtimeVoiceToolRuntime {
	private readonly toolsContext: ToolsContext = {};
	private readonly names = new Map<string, string>();
	private readonly arguments = new Map<string, string>();
	private tail = Promise.resolve();
	private calls = 0;
	private outputBytes = 0;
	private paidCalls = 0;
	private webCalls = 0;

	constructor(private readonly dependencies: RealtimeVoiceToolRuntimeDependencies) {}

	handle(event: ToolAdapterEvent): void {
		if (event.type === 'tool_call_start') {
			this.names.set(event.callId, event.name);
			this.arguments.set(event.callId, '');
			this.emit({
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.callId,
				toolName: event.name,
				name: event.name,
				serviceKind: 'tool',
			});
			return;
		}
		if (event.type === 'tool_call_args_delta') {
			const name = this.names.get(event.callId) ?? 'tool';
			const argsText = `${this.arguments.get(event.callId) ?? ''}${event.delta}`;
			this.arguments.set(event.callId, argsText);
			this.emit({
				type: 'tool_call_args_delta',
				iteration: 0,
				toolCallId: event.callId,
				toolName: name,
				jsonDelta: event.delta,
				argsText,
			});
			return;
		}
		this.tail = this.tail.then(() => this.run(event)).catch(this.dependencies.onError);
	}

	private async run(event: Extract<ToolAdapterEvent, { type: 'tool_call' }>): Promise<void> {
		if (this.dependencies.signal.aborted || !this.dependencies.connection()) return;
		const tool = this.dependencies.tools.find((candidate) => candidate.id === event.name);
		const args = parseToolArgs(event.arguments);
		if (!this.names.has(event.callId)) {
			this.names.set(event.callId, event.name);
			this.emit({
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.callId,
				toolName: event.name,
				name: event.name,
				serviceKind: 'tool',
			});
		}
		this.emit({
			type: 'tool_call_input',
			iteration: 0,
			toolCallId: event.callId,
			toolName: event.name,
			input: args,
			argsText: event.arguments,
			name: event.name,
			serviceKind: 'tool',
		});
		this.dependencies.onThinking();

		const budgetError = this.consumeBudget(event.name);
		if (budgetError) {
			await this.finish(event.callId, event.name, args, budgetError, true, 0);
			return;
		}

		const toolCall: ToolCall = { id: event.callId, name: event.name, args };
		for await (const runtimeEvent of runToolCall(
			tool,
			toolCall,
			this.dependencies.signal,
			this.toolsContext,
			{ runId: this.dependencies.sessionId, windowId: this.dependencies.windowId },
			this.dependencies.resources
		)) {
			if (runtimeEvent.type === 'tool_permission_request') this.emit(runtimeEvent);
			if (runtimeEvent.type === 'tool_call_end') {
				await this.finish(
					event.callId,
					event.name,
					runtimeEvent.input,
					runtimeEvent.output,
					runtimeEvent.isError === true,
					runtimeEvent.durationMs
				);
			}
		}
	}

	private consumeBudget(name: string): string | undefined {
		this.calls += 1;
		if (this.calls > MAX_TOOL_CALLS) return 'Error: realtime voice tool-call budget exhausted.';
		if (PAID_TOOLS.has(name)) {
			this.paidCalls += 1;
			if (this.paidCalls > MAX_PAID_TOOL_CALLS) return 'Error: paid tool-call budget exhausted.';
		}
		if (WEB_TOOLS.has(name)) {
			this.webCalls += 1;
			if (this.webCalls > MAX_WEB_TOOL_CALLS) return 'Error: web tool-call budget exhausted.';
		}
		return undefined;
	}

	private async finish(
		callId: string,
		name: string,
		input: unknown,
		output: unknown,
		isError: boolean,
		durationMs: number
	): Promise<void> {
		const outputText = formatToolOutput(output);
		this.outputBytes += Buffer.byteLength(outputText, 'utf8');
		const exhausted = this.outputBytes > MAX_TOOL_OUTPUT_BYTES;
		const finalOutput = exhausted
			? 'Error: realtime voice tool-output budget exhausted.'
			: outputText;
		const finalError = isError || exhausted;
		this.emit({
			type: 'tool_call_result',
			iteration: 0,
			toolCallId: callId,
			toolName: name,
			input,
			output: finalOutput,
			outputText: finalOutput,
			status: finalError ? 'error' : 'ok',
			durationMs,
			...(finalError ? { errorText: finalOutput } : {}),
			name,
			serviceKind: 'tool',
		});
		if (!this.dependencies.signal.aborted) {
			await this.dependencies.connection()?.addToolResult(callId, finalOutput);
		}
	}

	private emit(event: RealtimeVoiceToolPayload): void {
		this.dependencies.emit({
			...event,
			sessionId: this.dependencies.sessionId,
			agentId: 'main',
			runId: this.dependencies.sessionId,
		} as RealtimeVoiceEvent);
	}
}
