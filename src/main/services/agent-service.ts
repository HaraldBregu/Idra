import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { app } from 'electron';
import { AgentSettingsStore } from './agent-settings-store';
import { AgentSession } from './agent-session';
import { AgentWorkspace } from './agent-workspace';
import { History } from './history';
import { AgentRuntime } from '../agent/loop/loop';
import { RuntimeEvent } from '../agent';
import { AgentResponseEvent, AgentRunStopReason } from '../../shared/agent/types';
import { toError } from '../ipc/core/error';

export interface AgentSendOptions {
	runId?: string;
	sessionId?: string;
	streamEvent?: (event: AgentResponseEvent) => void;
}

export class AgentService {
	private readonly activeRuns = new Map<string, AbortController>();
	private readonly defaultAgentId: string;
	private readonly agentWorkspace: AgentWorkspace;
	private readonly agentSettingsStore: AgentSettingsStore;
	private readonly history: History;

	constructor(agentSettingsStore: AgentSettingsStore, defaultAgentId = 'main') {
		this.defaultAgentId = defaultAgentId;
		const location = resolveAgentUsageLocation();

		this.agentWorkspace = new AgentWorkspace(location);
		this.agentSettingsStore = agentSettingsStore;
		this.history = new History(location);
	}

	async send(message: string, agentId?: string, options: AgentSendOptions = {}): Promise<string> {
		const resolvedAgentId = agentId?.trim() || this.defaultAgentId;

		this.cancel(resolvedAgentId);
		const runId = options.runId ?? randomUUID();
		const sessionId = options.sessionId ?? resolvedAgentId;

		let response = '';
		let controller: AbortController | undefined;
		try {
			controller = new AbortController();
			const sessionInput = {
				task: 'chat',
				message,
				sessionId,
			};
			const session = new AgentSession(sessionInput);
			const runtime = new AgentRuntime(
				this.agentWorkspace,
				this.agentSettingsStore,
				this.history,
				session
			);
			const input = {
				...sessionInput,
				maxRetries: 1,
			};
			const stream = runtime.run(input);
			this.activeRuns.set(resolvedAgentId, controller);

			for await (const event of stream) {
				// if (event.type === 'run_started')
				// 	providerId = event.providerId;
				if (event.type === 'model_call_delta')
					response += event.delta;
				if (event.type === 'run_finished')
					response = event.result.text || response;

				for (const responseEvent of runtimeEventToAgentEvents(
					event,
					resolvedAgentId,
					runId,
				)) {
					options.streamEvent?.(responseEvent);
				}
			}
			return response;
		} catch (error) {
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

	cancel(agentId?: string): void {
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
}

export function resolveAgentUsageLocation(): string {
	return path.join(resolveLocation(), 'agent');
}

function resolveLocation(): string {
	try {
		return app.getPath('userData');
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday');
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

function runtimeEventToAgentEvents(
	event: RuntimeEvent,
	agentId: string,
	runId: string,
): AgentResponseEvent[] {
	if (event.type === 'run_started') {
		return [{ type: 'run_state', state: 'thinking', agentId, runId }];
	}
	if (event.type === 'model_call_start') {
		return [{ type: 'model_selected', model: event.model, agentId, runId }];
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
