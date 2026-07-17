import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
	clearMessages as clearSessionMessages,
	deleteSession as deleteStoredSession,
	createSessionState,
	init,
	listSessions,
	loadMessages,
	type SessionCategory,
	type SessionState,
} from './session';
import { streamGoal } from './run/run_goal';
import { streamChatGoal } from './run/run_goal_chat';
import { agentLocation } from '../shared/agent_location';
import { destroyCron, initCron, startCron } from './cron';
import { startHealth, stopHealth } from './health';
import { rejectPendingToolPermissions } from './policy';
import type { Config, Message, RuntimeEvent, RuntimeInput } from './types';
import type {
	AgentHistoryContentBlock,
	AgentHistoryMessage,
	AgentInputFile,
	AgentResponseEvent,
	AgentRunStopReason,
	AgentSessionSummary,
} from '../../shared/agent_types';
import { toError } from '../ipc/core/error';


export interface AgentSendOptions {
	runId?: string;
	sessionId?: string;
	category?: SessionCategory;
	providerId?: string;
	modelId?: string;
	files?: AgentInputFile[];
	streamEvent?: (event: AgentResponseEvent) => void;
}

export class Agent {
	private readonly activeRuns = new Map<string, AbortController>();
	private readonly lastMessagesLimit = 50;
	private isStarted = false;
	readonly config: Config;
	readonly session: SessionState;

	constructor() {
		this.config = { location: path.resolve(agentLocation()) };
		initCron();
		this.session = createSessionState();
	}

	start(logger: {
		info(scope: string, message: string, data?: unknown): void;
		error(scope: string, message: string, error?: unknown): void;
	}): void {
		if (this.isStarted) return;
		this.isStarted = true;
		void startCron().catch((error) => {
			logger.error('Cron', 'Failed to start persistent cron scheduler', error);
		});
		startHealth(this, logger);
	}

	destroy(): void {
		stopHealth();
		destroyCron();
	}

	async send(message: string, agentId: string, options: AgentSendOptions = {}): Promise<string> {
		const resolvedAgentId = agentId.trim();

		this.cancel(resolvedAgentId);
		const runId = options.runId ?? randomUUID();

		let response = '';
		let controller: AbortController | undefined;
		try {
			controller = new AbortController();

			const input = {
				task: 'chat',
				message,
				...(options.files?.length ? { files: options.files } : {}),
				...(options.sessionId ? { sessionId: options.sessionId } : {}),
				...(options.providerId ? { providerId: options.providerId } : {}),
				...(options.modelId ? { model: options.modelId } : {}),
			} satisfies RuntimeInput;

			init(this.session, this.config, input, options.category);

			const events = streamGoal(
				this.config,
				this.session,
				input,
				controller.signal,
				options.category,
			);

			this.activeRuns.set(resolvedAgentId, controller);

			for await (const event of events) {
				// if (event.type === 'run_started')
				// 	providerId = event.providerId;
				if (event.type === 'model_call_delta') response += event.delta;
				if (event.type === 'run_finished') response = event.result.text || response;

				for (const responseEvent of runtimeEventToAgentEvents(event, resolvedAgentId, runId)) {
					options.streamEvent?.(responseEvent);
				}
			}
			return response;
		} catch (error) {
			// A run superseded by cancel/new message ends quietly instead of surfacing an error.
			if (controller?.signal.aborted) return response;
			const cause = toError(error, 'Agent request failed.');
			const responseEvent = {
				type: 'run_state',
				state: 'error',
				label: cause.message,
				agentId: resolvedAgentId,
				runId,
			} satisfies AgentResponseEvent;
			options.streamEvent?.(responseEvent);
			throw cause;
		} finally {
			if (controller && this.activeRuns.get(resolvedAgentId) === controller)
				this.activeRuns.delete(resolvedAgentId);
		}
	}

	async sendGoal(goalText: string, agentId: string, options: AgentSendOptions = {}): Promise<string> {
		const resolvedAgentId = agentId.trim();

		this.cancel(resolvedAgentId);
		const runId = options.runId ?? randomUUID();

		let response = '';
		let controller: AbortController | undefined;
		try {
			controller = new AbortController();
			const input = {
				task: 'goal',
				message: goalText,
				...(options.files?.length ? { files: options.files } : {}),
				...(options.sessionId ? { sessionId: options.sessionId } : {}),
				...(options.providerId ? { providerId: options.providerId } : {}),
				...(options.modelId ? { model: options.modelId } : {}),
			} satisfies RuntimeInput;

			init(this.session, this.config, input, options.category);
			this.activeRuns.set(resolvedAgentId, controller);

			const events = streamChatGoal(
				this.config,
				this.session,
				input,
				controller.signal,
				options.category,
			);

			for await (const event of events) {
				if (event.type === 'model_call_delta') response += event.delta;
				if (event.type === 'run_finished') response = event.result.text || response;

				for (const responseEvent of runtimeEventToAgentEvents(event, resolvedAgentId, runId)) {
					options.streamEvent?.(responseEvent);
				}
			}
			return response;
		} catch (error) {
			if (controller?.signal.aborted) return response;
			const cause = toError(error, 'Agent goal request failed.');
			options.streamEvent?.({
				type: 'run_state',
				state: 'error',
				label: cause.message,
				agentId: resolvedAgentId,
				runId,
			});
			throw cause;
		} finally {
			if (controller && this.activeRuns.get(resolvedAgentId) === controller)
				this.activeRuns.delete(resolvedAgentId);
		}
	}

	listSessions(): AgentSessionSummary[] {
		return listSessions(this.config.location);
	}

	getLastMessages(sessionId: string): AgentHistoryMessage[] {
		return loadMessages(this.config, sessionId)
			.slice(-this.lastMessagesLimit)
			.flatMap(toHistoryMessages);
	}

	clearMessages(sessionId: string): void {
		clearSessionMessages(this.session, this.config, sessionId);
	}

	deleteSession(sessionId: string): void {
		deleteStoredSession(this.session, this.config, sessionId);
	}

	cancel(agentId?: string): void {
		rejectPendingToolPermissions();
		if (agentId) {
			this.activeRuns.get(agentId)?.abort();
			this.activeRuns.delete(agentId);
			return;
		}
		for (const controller of this.activeRuns.values()) controller.abort();
		this.activeRuns.clear();
	}

	isBusy(agentId: string): boolean {
		return this.activeRuns.has(agentId);
	}

	runningSkill(): string | undefined {
		return this.session.context.skill;
	}
}

function normalizeStopReason(value: string | undefined): AgentRunStopReason {
	if (value === 'max_tokens') return 'max_tokens';
	if (value === 'max_iterations' || value === 'error_max_turns') return 'max_iterations';
	if (value === 'cancelled') return 'cancelled';
	if (value === 'error') return 'error';
	return 'end_turn';
}

function outputText(output: unknown): string {
	if (typeof output === 'string') return output;
	try {
		return JSON.stringify(output);
	} catch {
		return String(output);
	}
}

function toHistoryMessages(message: Message): AgentHistoryMessage[] {
	if (message.role === 'system') return [];
	if (
		Array.isArray(message.content) &&
		message.content.length > 0 &&
		message.content.every((block) => block.internal === true)
	)
		return [];

	const content = toTextContent(message.content);

	if (message.role === 'assistant') {
		const messages: AgentHistoryMessage[] = [
			{
				role: 'assistant',
				content,
				contentBlocks: toHistoryContentBlocks(message),
			},
		];
		for (const toolCall of message.toolCalls ?? []) {
			if (!toolCall.result) continue;
			const output = toTextContent(toolCall.result.content);
			const isError = toolCall.result.isError ?? output.startsWith('Error:');
			messages.push({
				role: 'tool',
				content: output,
				toolUseId: toolCall.id,
				isError,
				status: isError ? 'error' : 'ok',
				output,
			});
		}
		return messages;
	}

	return [{ role: 'user', content }];
}

function toHistoryContentBlocks(message: Message): AgentHistoryContentBlock[] {
	const blocks = Array.isArray(message.content)
		? message.content
			.map((block): AgentHistoryContentBlock | undefined => {
				if (block.type === 'text' && typeof block.text === 'string') {
					return { type: 'text', text: block.text };
				}
				return undefined;
			})
			.filter((block): block is AgentHistoryContentBlock => block !== undefined)
		: [];

	for (const toolCall of message.toolCalls ?? []) {
		blocks.push({
			type: 'tool_use',
			toolUseId: toolCall.id,
			toolName: toolCall.name,
			toolArgs: toolCall.args,
		});
	}

	return blocks;
}

function toTextContent(content: Message['content']): string {
	if (typeof content === 'string') return content;
	return content
		.map((block) => (block.type === 'text' && typeof block.text === 'string' ? block.text : ''))
		.filter(Boolean)
		.join('\n');
}

function runtimeEventToAgentEvents(
	event: RuntimeEvent,
	agentId: string,
	runId: string
): AgentResponseEvent[] {
	if (event.type === 'run_started') {
		return [{ type: 'run_state', state: 'thinking', agentId, runId }];
	}
	if (event.type === 'model_call_start') {
		return [{ type: 'model_selected', model: event.model, effort: event.effort, agentId, runId }];
	}
	if (event.type === 'model_call_delta') {
		return [{ type: 'text_delta', delta: event.delta, agentId, runId }];
	}
	if (event.type === 'tool_call_start') {
		return [
			{
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
			{
				type: 'tool_call_input',
				iteration: 0,
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				input: event.input,
				argsText: outputText(event.input),
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'tool_permission_request') {
		return [
			{
				type: 'tool_permission_request',
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				input: event.input,
				mode: 'ask',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'tool_call_end') {
		const status = event.isError ? 'error' : 'ok';
		return [
			{
				type: 'tool_call_result',
				iteration: 0,
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				input: event.input,
				output: event.output,
				outputText: outputText(event.output),
				status,
				durationMs: event.durationMs,
				errorText: event.isError ? outputText(event.output) : undefined,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'run_finished') {
		return [
			{
				type: 'run_finished',
				stopReason:
					event.result.subtype === 'error_max_turns'
						? 'max_iterations'
						: normalizeStopReason(event.result.stopReason),
				outputChars: event.result.text.length,
				agentId,
				runId,
			},
			{ type: 'run_state', state: 'completed', agentId, runId },
		];
	}
	return [];
}
