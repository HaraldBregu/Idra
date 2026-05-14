import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { AssistantService } from '../assistant';
import type { LoggerService } from '../logger';
import { wrapSimpleHandler } from './ipc-error-handler';
import { AssistantChannels } from '../../shared/ipc-channels';
import type {
	AssistantHistoryMessage,
	AssistantPendingState,
} from '../../shared/service';
import type { TranscriptEntry } from '../assistant/provider/types';

function transcriptToHistory(t: TranscriptEntry[]): AssistantHistoryMessage[] {
	return t.map((entry) => {
		if (entry.role === 'user') {
			return { role: 'user', content: entry.content };
		}
		if (entry.role === 'assistant') {
			const text = entry.content
				.filter((b) => b.type === 'text')
				.map((b) => b.text ?? '')
				.join('');
			return { role: 'assistant', content: text || null, contentBlocks: entry.content };
		}
		return {
			role: 'tool',
			toolUseId: entry.toolUseId,
			isError: entry.isError,
			content: entry.content
				.map((c) => (c.type === 'text' ? (c.text ?? '') : '[binary]'))
				.join('\n'),
		};
	});
}

export class AssistantIpc implements IpcModule {
	readonly name = 'assistant';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');
		const assistant = container.get<AssistantService>('assistantService');

		ipcMain.handle(
			AssistantChannels.send,
			wrapSimpleHandler((message: string): Promise<string> => {
				return assistant.send(message);
			}, AssistantChannels.send)
		);

		ipcMain.handle(
			AssistantChannels.reset,
			wrapSimpleHandler(() => assistant.reset(), AssistantChannels.reset)
		);

		ipcMain.handle(
			AssistantChannels.getHistory,
			wrapSimpleHandler(async (): Promise<AssistantHistoryMessage[]> => {
				const transcript = await assistant.getHistory();
				return transcriptToHistory(transcript);
			}, AssistantChannels.getHistory)
		);

		ipcMain.handle(
			AssistantChannels.resolveApproval,
			wrapSimpleHandler((id: string, approved: boolean): boolean => {
				return assistant.resolveApproval(id, approved);
			}, AssistantChannels.resolveApproval)
		);

		ipcMain.handle(
			AssistantChannels.resolveInput,
			wrapSimpleHandler((id: string, answer: string): boolean => {
				return assistant.resolveInput(id, answer);
			}, AssistantChannels.resolveInput)
		);

		ipcMain.handle(
			AssistantChannels.cancel,
			wrapSimpleHandler((): void => {
				assistant.cancel();
			}, AssistantChannels.cancel)
		);

		ipcMain.handle(
			AssistantChannels.getPending,
			wrapSimpleHandler((): AssistantPendingState => {
				return assistant.getPending();
			}, AssistantChannels.getPending)
		);

		logger.info('AssistantIpc', `Registered ${this.name} module`);
	}
}
