import { randomUUID } from 'node:crypto';
import {
	REALTIME_VOICE_CHANNELS,
	REALTIME_VOICE_MAX_AUDIO_BASE64_LENGTH,
	REALTIME_VOICE_SAMPLE_RATE,
	type RealtimeVoiceEvent,
	type RealtimeVoiceSession,
	type RealtimeVoiceStartRequest,
	type RealtimeVoiceState,
} from '../../shared/realtime_voice';
import { rejectPendingToolPermissions } from '../agent/permissions';
import { runToolCall } from '../agent/runner/run_tool_call';
import { formatToolOutput } from '../agent/runner/run_common';
import { parseToolArgs } from '../shared/parse_tool_args';
import type { ToolsContext } from '../agent/context';
import type { KeyedMutex } from '../agent/mutex';
import type { RuntimeEvent, Tool, ToolCall } from '../agent/types';
import type { RealtimeVoiceConversation, RealtimeVoiceConversationFactory } from './conversation';
import type {
	RealtimeVoiceAdapter,
	RealtimeVoiceAdapterEvent,
	RealtimeVoiceAdapterRequest,
	RealtimeVoiceConnection,
} from './types';

const MAX_TOOL_CALLS = 100;
const MAX_TOOL_OUTPUT_BYTES = 2_000_000;
const MAX_PAID_TOOL_CALLS = 3;
const MAX_WEB_TOOL_CALLS = 8;
const PAID_TOOLS = new Set(['create_image', 'create_video', 'create_sound']);
const WEB_TOOLS = new Set(['search_web', 'fetch_web_page', 'use_web_browser']);

export interface ResolvedRealtimeVoiceConfiguration extends RealtimeVoiceAdapterRequest {
	providerId: string;
}

export interface RealtimeVoiceManagerDependencies {
	adapter: RealtimeVoiceAdapter;
	resolveConfiguration(): Promise<ResolvedRealtimeVoiceConfiguration>;
	createConversation: RealtimeVoiceConversationFactory;
	resources: KeyedMutex;
	emit(windowId: number, event: RealtimeVoiceEvent): void;
}

interface ActiveRealtimeVoiceSession {
	info: RealtimeVoiceSession;
	windowId: number;
	controller: AbortController;
	connection?: RealtimeVoiceConnection;
	conversation: RealtimeVoiceConversation;
	tools: Tool[];
	toolsContext: ToolsContext;
	toolNames: Map<string, string>;
	toolArguments: Map<string, string>;
	toolTail: Promise<void>;
	inputTail: Promise<void>;
	pendingInputCharacters: number;
	toolCalls: number;
	toolOutputBytes: number;
	paidToolCalls: number;
	webToolCalls: number;
	finalTranscripts: Set<string>;
	state: RealtimeVoiceState;
	closed: boolean;
}

export class RealtimeVoiceManager {
	private readonly byWindow = new Map<number, ActiveRealtimeVoiceSession>();
	private readonly byId = new Map<string, ActiveRealtimeVoiceSession>();

	constructor(private readonly dependencies: RealtimeVoiceManagerDependencies) {}

	async start(windowId: number, request: RealtimeVoiceStartRequest): Promise<RealtimeVoiceSession> {
		const chatSessionId = request?.chatSessionId?.trim();
		if (!chatSessionId) throw new Error('Realtime voice chat session id is required.');
		const previous = this.byWindow.get(windowId);
		if (previous) await this.stop(windowId, previous.info.id);

		const configuration = await this.dependencies.resolveConfiguration();
		const info: RealtimeVoiceSession = {
			id: randomUUID(),
			providerId: configuration.providerId,
			modelId: configuration.model,
			input: { format: 'pcm16', sampleRate: REALTIME_VOICE_SAMPLE_RATE, channels: REALTIME_VOICE_CHANNELS },
			output: { format: 'pcm16', sampleRate: REALTIME_VOICE_SAMPLE_RATE, channels: REALTIME_VOICE_CHANNELS },
		};
		const active: ActiveRealtimeVoiceSession = {
			info,
			windowId,
			controller: new AbortController(),
			conversation: this.dependencies.createConversation(chatSessionId, configuration.model),
			tools: configuration.tools,
			toolsContext: {},
			toolNames: new Map(),
			toolArguments: new Map(),
			toolTail: Promise.resolve(),
			inputTail: Promise.resolve(),
			pendingInputCharacters: 0,
			toolCalls: 0,
			toolOutputBytes: 0,
			paidToolCalls: 0,
			webToolCalls: 0,
			finalTranscripts: new Set(),
			state: 'connecting',
			closed: false,
		};
		this.byWindow.set(windowId, active);
		this.byId.set(info.id, active);
		this.emit(active, { type: 'state', sessionId: info.id, status: 'connecting' });

		try {
			const connection = await this.dependencies.adapter.connect(configuration, (event) =>
				this.handleAdapterEvent(active, event)
			);
			if (active.closed || this.byId.get(info.id) !== active) {
				await connection.stop();
				throw new Error('Realtime voice session was stopped during connection.');
			}
			active.connection = connection;
			this.emit(active, {
				type: 'started',
				sessionId: info.id,
				providerId: info.providerId,
				modelId: info.modelId,
			});
			this.setState(active, 'listening');
			return info;
		} catch (error) {
			await this.close(active, false);
			throw error;
		}
	}

	appendAudio(windowId: number, sessionId: string, audio: string): Promise<void> {
		const active = this.owned(windowId, sessionId);
		if (!active) return Promise.resolve();
		if (
			!audio ||
			audio.length > REALTIME_VOICE_MAX_AUDIO_BASE64_LENGTH ||
			!/^[A-Za-z0-9+/]+={0,2}$/.test(audio)
		) {
			throw new Error('Invalid realtime voice audio chunk.');
		}
		if (
			active.pendingInputCharacters + audio.length >
			REALTIME_VOICE_MAX_AUDIO_BASE64_LENGTH
		) {
			throw new Error('Realtime voice input queue is full.');
		}
		active.pendingInputCharacters += audio.length;
		const task = active.inputTail
			.then(async () => {
				if (active.controller.signal.aborted) return;
				if (!active.connection) throw new Error('Realtime voice connection is not ready.');
				await active.connection.appendAudio(audio);
			})
			.finally(() => {
				active.pendingInputCharacters -= audio.length;
			});
		active.inputTail = task.catch(() => undefined);
		return task;
	}

	async interrupt(windowId: number, sessionId: string): Promise<void> {
		const active = this.owned(windowId, sessionId);
		if (!active?.connection) return;
		await active.connection.interrupt();
		this.emit(active, { type: 'interrupted', sessionId });
		this.setState(active, 'listening');
	}

	async stop(windowId: number, sessionId: string): Promise<void> {
		const active = this.owned(windowId, sessionId);
		if (!active) return;
		await this.close(active, true);
	}

	async stopWindow(windowId: number): Promise<void> {
		const active = this.byWindow.get(windowId);
		if (active) await this.close(active, true);
	}

	async stopAll(): Promise<void> {
		await Promise.allSettled([...this.byId.values()].map((active) => this.close(active, true)));
	}

	private owned(windowId: number, sessionId: string): ActiveRealtimeVoiceSession | undefined {
		const active = this.byId.get(sessionId);
		return active?.windowId === windowId ? active : undefined;
	}

	private handleAdapterEvent(active: ActiveRealtimeVoiceSession, event: RealtimeVoiceAdapterEvent): void {
		if (active.closed || this.byId.get(active.info.id) !== active) return;
		const sessionId = active.info.id;
		if (event.type === 'input_speech_started') {
			if (active.state === 'speaking' || active.state === 'thinking') {
				this.emit(active, { type: 'interrupted', sessionId });
			}
			this.emit(active, { type: event.type, sessionId, itemId: event.itemId });
			this.setState(active, 'listening');
			return;
		}
		if (event.type === 'input_speech_stopped') {
			active.conversation.addUserTurn();
			this.emit(active, { type: event.type, sessionId, itemId: event.itemId });
			this.emit(active, { type: 'user_turn', sessionId, itemId: event.itemId, transcript: 'Voice message' });
			this.setState(active, 'thinking');
			return;
		}
		if (event.type === 'assistant_transcript_delta') {
			this.emit(active, { type: event.type, sessionId, itemId: event.itemId, delta: event.delta });
			return;
		}
		if (event.type === 'assistant_transcript_final') {
			if (event.transcript.trim() && !active.finalTranscripts.has(event.itemId)) {
				active.finalTranscripts.add(event.itemId);
				active.conversation.addAssistantTranscript(event.transcript);
			}
			this.emit(active, { type: event.type, sessionId, itemId: event.itemId, text: event.transcript });
			return;
		}
		if (event.type === 'assistant_audio_delta') {
			this.setState(active, 'speaking');
			this.emit(active, { type: event.type, sessionId, audio: event.audio });
			return;
		}
		if (event.type === 'assistant_audio_done') {
			this.emit(active, { type: event.type, sessionId });
			this.setState(active, 'listening');
			return;
		}
		if (event.type === 'tool_call_start') {
			active.toolNames.set(event.callId, event.name);
			active.toolArguments.set(event.callId, '');
			this.emitTool(active, {
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
			const name = active.toolNames.get(event.callId) ?? 'tool';
			const argsText = `${active.toolArguments.get(event.callId) ?? ''}${event.delta}`;
			active.toolArguments.set(event.callId, argsText);
			this.emitTool(active, {
				type: 'tool_call_args_delta',
				iteration: 0,
				toolCallId: event.callId,
				toolName: name,
				jsonDelta: event.delta,
				argsText,
			});
			return;
		}
		if (event.type === 'tool_call') {
			active.toolTail = active.toolTail
				.then(() => this.runTool(active, event))
				.catch((error) => {
					if (!active.controller.signal.aborted) {
						this.emit(active, { type: 'error', sessionId, message: errorMessage(error) });
					}
				});
			return;
		}
		if (event.type === 'error') {
			this.emit(active, { type: 'error', sessionId, message: event.message });
			return;
		}
		if (event.type === 'closed') void this.close(active, false);
	}

	private async runTool(
		active: ActiveRealtimeVoiceSession,
		event: Extract<RealtimeVoiceAdapterEvent, { type: 'tool_call' }>
	): Promise<void> {
		if (active.controller.signal.aborted || !active.connection) return;
		const tool = active.tools.find((candidate) => candidate.id === event.name);
		const args = parseToolArgs(event.arguments);
		if (!active.toolNames.has(event.callId)) {
			active.toolNames.set(event.callId, event.name);
			this.emitTool(active, {
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.callId,
				toolName: event.name,
				name: event.name,
				serviceKind: 'tool',
			});
		}
		this.emitTool(active, {
			type: 'tool_call_input',
			iteration: 0,
			toolCallId: event.callId,
			toolName: event.name,
			input: args,
			argsText: event.arguments,
			name: event.name,
			serviceKind: 'tool',
		});
		this.setState(active, 'thinking');

		const budgetError = this.consumeToolBudget(active, event.name);
		if (budgetError) {
			await this.finishTool(active, event.callId, event.name, args, budgetError, true, 0);
			return;
		}

		const toolCall: ToolCall = { id: event.callId, name: event.name, args };
		for await (const runtimeEvent of runToolCall(
			tool,
			toolCall,
			active.controller.signal,
			active.toolsContext,
			{ runId: active.info.id, windowId: active.windowId },
			this.dependencies.resources
		)) {
			if (runtimeEvent.type === 'tool_permission_request') {
				this.emitTool(active, runtimeEvent);
			}
			if (runtimeEvent.type === 'tool_call_end') {
				await this.finishTool(
					active,
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

	private consumeToolBudget(active: ActiveRealtimeVoiceSession, name: string): string | undefined {
		active.toolCalls += 1;
		if (active.toolCalls > MAX_TOOL_CALLS) return 'Error: realtime voice tool-call budget exhausted.';
		if (PAID_TOOLS.has(name)) {
			active.paidToolCalls += 1;
			if (active.paidToolCalls > MAX_PAID_TOOL_CALLS) return 'Error: paid tool-call budget exhausted.';
		}
		if (WEB_TOOLS.has(name)) {
			active.webToolCalls += 1;
			if (active.webToolCalls > MAX_WEB_TOOL_CALLS) return 'Error: web tool-call budget exhausted.';
		}
		return undefined;
	}

	private async finishTool(
		active: ActiveRealtimeVoiceSession,
		callId: string,
		name: string,
		input: unknown,
		output: unknown,
		isError: boolean,
		durationMs: number
	): Promise<void> {
		const outputText = formatToolOutput(output);
		active.toolOutputBytes += Buffer.byteLength(outputText, 'utf8');
		const finalOutput =
			active.toolOutputBytes > MAX_TOOL_OUTPUT_BYTES
				? 'Error: realtime voice tool-output budget exhausted.'
				: outputText;
		const finalError = isError || active.toolOutputBytes > MAX_TOOL_OUTPUT_BYTES;
		this.emitTool(active, {
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
		if (!active.controller.signal.aborted) await active.connection?.addToolResult(callId, finalOutput);
	}

	private emitTool(
		active: ActiveRealtimeVoiceSession,
		event: Omit<Extract<RealtimeVoiceEvent, { type: RuntimeEvent['type'] | 'tool_call_args_delta' | 'tool_call_input' | 'tool_call_result' }>, 'sessionId' | 'agentId' | 'runId'>
	): void {
		this.dependencies.emit(active.windowId, {
			...event,
			sessionId: active.info.id,
			agentId: 'main',
			runId: active.info.id,
		} as RealtimeVoiceEvent);
	}

	private setState(active: ActiveRealtimeVoiceSession, state: RealtimeVoiceState): void {
		if (active.state === state || active.closed) return;
		active.state = state;
		this.emit(active, { type: 'state', sessionId: active.info.id, status: state });
	}

	private emit(active: ActiveRealtimeVoiceSession, event: RealtimeVoiceEvent): void {
		this.dependencies.emit(active.windowId, event);
	}

	private async close(active: ActiveRealtimeVoiceSession, stopConnection: boolean): Promise<void> {
		if (active.closed) return;
		active.closed = true;
		this.byId.delete(active.info.id);
		if (this.byWindow.get(active.windowId) === active) this.byWindow.delete(active.windowId);
		active.controller.abort(new DOMException('Realtime voice session stopped.', 'AbortError'));
		rejectPendingToolPermissions(active.info.id);
		this.emit(active, { type: 'state', sessionId: active.info.id, status: 'ending' });
		if (stopConnection) await active.connection?.stop();
		this.emit(active, { type: 'closed', sessionId: active.info.id });
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
