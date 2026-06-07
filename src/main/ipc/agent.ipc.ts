import { promises as fs } from 'node:fs';
import { ipcMain, shell } from 'electron';
import type { IpcModule } from './module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { wrapSimpleHandler } from './errorHandler';
import { AgentChannels } from '../../shared/ipc-channels';
import { resolveAgentDataPath } from '../tools/startup/path';
import {
	isModelReasoningEffort,
	type AgentHistoryMessage,
	type AgentSendRuntimeOptions,
} from '../../shared/agents/service';
import type { AgentSendOptions } from '../agent_v2';

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

export class AgentIpc implements IpcModule {
	readonly name = 'agent';

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const logger = container.get('logger');
		const agent = container.get('agentService');
		const startupFiles = container.get('startupFiles');
		const listStartupFiles = () => startupFiles.listFiles('main');
		const readStartupFile = (name: string) => startupFiles.readFile('main', name);
		const writeStartupFile = (name: string, content: string) =>
			startupFiles.writeFile('main', name, content);

		ipcMain.handle(
			AgentChannels.send,
			wrapSimpleHandler((message: string, options?: AgentSendRuntimeOptions): Promise<string> => {
				return agent.send(message, undefined, normalizeAgentSendRuntimeOptions(options));
			}, AgentChannels.send)
		);

		ipcMain.handle(
			AgentChannels.sendV2,
			wrapSimpleHandler(async (message: string, options?: AgentSendRuntimeOptions): Promise<string> => {
				return agent.send(message, 'main', {
					...normalizeAgentSendRuntimeOptions(options),
					streamEvent: (event) => eventBus.broadcast(AgentChannels.response, event),
				});
			}, AgentChannels.sendV2)
		);

		ipcMain.handle(
			AgentChannels.reset,
			wrapSimpleHandler(() => agent.cancel(), AgentChannels.reset)
		);

		ipcMain.handle(
			AgentChannels.getHistory,
			wrapSimpleHandler(async (): Promise<AgentHistoryMessage[]> => {
				return [];
			}, AgentChannels.getHistory)
		);

		ipcMain.handle(
			AgentChannels.openHistoryFolder,
			wrapSimpleHandler(async (): Promise<void> => {
				const target = resolveAgentDataPath('sessions');
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
