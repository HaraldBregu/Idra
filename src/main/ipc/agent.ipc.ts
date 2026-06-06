import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { ipcMain, shell } from 'electron';
import type { IpcModule } from './module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { wrapSimpleHandler } from './errorHandler';
import { AgentChannels } from '../../shared/ipc-channels';
import { AgentRuntime } from '../agent_v2';
import {
	isModelReasoningEffort,
	type AgentHistoryMessage,
	type AgentResponseEvent,
	type AgentSendRuntimeOptions,
} from '../../shared/agents/service';
import type { ToolResultBlock, ToolResultStatus, TranscriptEntry } from '../llm/types';
import type { AgentSendOptions } from '../agent/kernel';
import type { RuntimeEvent } from '../agent_v2/runtime';
import type { AgentRunStopReason } from '../../shared/agents/constants';

type ToolTranscriptEntry = Extract<TranscriptEntry, { role: 'tool' }>;

function toolResultStatus(entry: ToolTranscriptEntry): ToolResultStatus {
	return entry.status ?? (entry.isError ? 'error' : 'ok');
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function optionalStringList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const items = value
		.map(optionalTrimmedString)
		.filter((item): item is string => Boolean(item));
	return items.length > 0 ? items : undefined;
}

function normalizeV2StopReason(value: string | undefined): AgentRunStopReason {
	if (value === 'max_tokens') return 'max_tokens';
	if (value === 'max_iterations' || value === 'error_max_turns') return 'max_iterations';
	if (value === 'cancelled') return 'cancelled';
	if (value === 'error') return 'error';
	return 'end_turn';
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
		return [
			{ type: 'model_selected', providerId: 'agent_v2', model: event.model, agentId, runId },
		];
	}
	if (event.type === 'model_call_delta') {
		return [{ type: 'text_delta', delta: event.delta, agentId, runId }];
	}
	if (event.type === 'tool_call_start') {
		return [
			{
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.toolName,
				toolName: event.toolName,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'tool_call_end') {
		return [
			{
				type: 'tool_call_result',
				iteration: 0,
				toolCallId: event.toolName,
				toolName: event.toolName,
				input: {},
				output: event.output,
				outputText: typeof event.output === 'string' ? event.output : JSON.stringify(event.output),
				status: 'ok',
				durationMs: 0,
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
						: normalizeV2StopReason(event.result.stopReason),
				outputChars: event.result.text.length,
				agentId,
				runId,
			},
			{ type: 'run_state', state: 'completed', agentId, runId },
		];
	}
	if (event.type === 'run_stopped') {
		return [{ type: 'run_state', state: 'cancelled', label: event.reason, agentId, runId }];
	}
	return [];
}

export function normalizeAgentSendRuntimeOptions(options: unknown): AgentSendOptions {
	if (options === undefined || options === null) return {};
	if (!isRecord(options)) throw new Error('Invalid assistant runtime options.');

	const effort = options.effort;
	if (effort !== undefined && !isModelReasoningEffort(effort)) {
		throw new Error('Invalid assistant reasoning effort.');
	}

	const sessionId =
		optionalTrimmedString(options.sessionId) ?? optionalTrimmedString(options.agentRuntime);
	return {
		...(optionalTrimmedString(options.runId) ? { runId: optionalTrimmedString(options.runId) } : {}),
		...(sessionId ? { sessionId } : {}),
		...(optionalTrimmedString(options.providerId)
			? { providerId: optionalTrimmedString(options.providerId) }
			: {}),
		...(optionalTrimmedString(options.model) ? { model: optionalTrimmedString(options.model) } : {}),
		...(effort ? { effort } : {}),
		...(typeof options.lightContext === 'boolean'
			? { lightContext: options.lightContext }
			: {}),
		...(optionalStringList(options.toolsAllow)
			? { toolsAllow: optionalStringList(options.toolsAllow) }
			: {}),
		...(optionalStringList(options.toolsDeny)
			? { toolsDeny: optionalStringList(options.toolsDeny) }
			: {}),
	};
}

async function openPathOrThrow(target: string): Promise<void> {
	const error = await shell.openPath(target);
	if (error) {
		throw new Error(error);
	}
}

export function transcriptToHistory(t: TranscriptEntry[]): AgentHistoryMessage[] {
	return t.map((entry) => {
		if (entry.role === 'user') {
			return { role: 'user', content: entry.content };
		}
		if (entry.role === 'assistant') {
			const text = entry.content
				.filter((b) => b.type === 'text')
				.map((b) => b.text)
				.join('');
			const contentBlocks = entry.content.filter(
				(b) => b.type === 'text' || b.type === 'tool_use'
			);
			return { role: 'assistant', content: text || null, contentBlocks };
		}
		const status = toolResultStatus(entry);
		return {
			role: 'tool',
			toolUseId: entry.toolUseId,
			isError: status !== 'ok' || entry.isError === true,
			status,
			output: resultBlocksToOutput(entry.content),
			content: entry.content
				.map((c) => (c.type === 'text' ? c.text : '[binary]'))
				.join('\n'),
		};
	});
}

export class AgentIpc implements IpcModule {
	readonly name = 'agent';

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const logger = container.get('logger');
		const agent = container.get('agentService');
		const agentDataDirectory = container.get('agentDataDirectory');
		const listStartupFiles = () => agent.listStartupFiles('main');
		const readStartupFile = (name: string) => agent.readStartupFile('main', name);
		const writeStartupFile = (name: string, content: string) =>
			agent.writeStartupFile('main', name, content);

		ipcMain.handle(
			AgentChannels.send,
			wrapSimpleHandler((message: string, options?: AgentSendRuntimeOptions): Promise<string> => {
				return agent.send(message, undefined, {
					...normalizeAgentSendRuntimeOptions(options),
					streamEvent: (event) => eventBus.broadcast('agent:response', event),
				});
			}, AgentChannels.send)
		);

		ipcMain.handle(
			AgentChannels.reset,
			wrapSimpleHandler(() => agent.reset(), AgentChannels.reset)
		);

		ipcMain.handle(
			AgentChannels.getHistory,
			wrapSimpleHandler(async (): Promise<AgentHistoryMessage[]> => {
				const transcript = await agent.getHistory();
				return transcriptToHistory(transcript);
			}, AgentChannels.getHistory)
		);

		ipcMain.handle(
			AgentChannels.openHistoryFolder,
			wrapSimpleHandler(async (): Promise<void> => {
				const target = agentDataDirectory.resolve('sessions');
				await fs.mkdir(target, { recursive: true, mode: 0o700 });
				if (process.platform !== 'win32') {
					await fs.chmod(target, 0o700).catch(() => undefined);
				}
				await openPathOrThrow(target);
			}, AgentChannels.openHistoryFolder)
		);

		ipcMain.handle(
			AgentChannels.cancel,
			wrapSimpleHandler((): void => {
				agent.cancel();
			}, AgentChannels.cancel)
		);

		ipcMain.handle(
			AgentChannels.listStartupFiles,
			wrapSimpleHandler(() => {
				return listStartupFiles();
			}, AgentChannels.listStartupFiles)
		);

		ipcMain.handle(
			AgentChannels.readStartupFile,
			wrapSimpleHandler((name: string) => {
				return readStartupFile(name);
			}, AgentChannels.readStartupFile)
		);

		ipcMain.handle(
			AgentChannels.writeStartupFile,
			wrapSimpleHandler((name: string, content: string) => {
				return writeStartupFile(name, content);
			}, AgentChannels.writeStartupFile)
		);

		ipcMain.handle(
			AgentChannels.listWorkspaceFiles,
			wrapSimpleHandler(() => {
				return listStartupFiles();
			}, AgentChannels.listWorkspaceFiles)
		);

		ipcMain.handle(
			AgentChannels.readWorkspaceFile,
			wrapSimpleHandler((name: string) => {
				return readStartupFile(name);
			}, AgentChannels.readWorkspaceFile)
		);

		ipcMain.handle(
			AgentChannels.writeWorkspaceFile,
			wrapSimpleHandler((name: string, content: string) => {
				return writeStartupFile(name, content);
			}, AgentChannels.writeWorkspaceFile)
		);

		logger.info('AgentIpc', `Registered ${this.name} module`);
	}
}
