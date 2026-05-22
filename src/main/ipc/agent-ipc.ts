import { promises as fs } from 'node:fs';
import { ipcMain, shell } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { AgentChannels } from '../../shared/ipc-channels';
import type { AgentHistoryMessage } from '../../shared/agents/service';
import type { ToolResultBlock, ToolResultStatus, TranscriptEntry } from '../provider/types';
import { DEFAULT_AGENT_ID } from '../constants';

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

	register(container: MainServiceContainer, _eventBus: EventBus): void {
			const logger = container.get('logger');
			const agent = container.get('agentService');
			const startupFiles = container.get('startupFiles');
			const userDataDirectory = container.get('userDataDirectory');

		ipcMain.handle(
			AgentChannels.send,
			wrapSimpleHandler((message: string): Promise<string> => {
				return agent.send(message);
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
				const target = userDataDirectory.resolve('agent', 'sessions');
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
				AgentChannels.listWorkspaceFiles,
				wrapSimpleHandler(() => {
					return startupFiles.listFiles(DEFAULT_AGENT_ID);
				}, AgentChannels.listWorkspaceFiles)
			);

			ipcMain.handle(
				AgentChannels.readWorkspaceFile,
				wrapSimpleHandler((name: string) => {
					return startupFiles.readFile(DEFAULT_AGENT_ID, name);
				}, AgentChannels.readWorkspaceFile)
			);

			ipcMain.handle(
				AgentChannels.writeWorkspaceFile,
				wrapSimpleHandler((name: string, content: string) => {
					return startupFiles.writeFile(DEFAULT_AGENT_ID, name, content);
				}, AgentChannels.writeWorkspaceFile)
			);

		logger.info('AgentIpc', `Registered ${this.name} module`);
	}
}
