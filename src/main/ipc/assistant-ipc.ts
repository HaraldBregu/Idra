import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { AssistantChannels } from '../../shared/ipc-channels';
import type {
	ApprovalDecision,
	AssistantHistoryMessage,
	AssistantPendingState,
} from '../../shared/service';
import type { TranscriptEntry } from '../provider/types';

export function transcriptToHistory(t: TranscriptEntry[]): AssistantHistoryMessage[] {
	return t.map((entry) => {
		if (entry.role === 'user') {
			return { role: 'user', content: entry.content };
		}
		if (entry.role === 'assistant') {
			const text = entry.content
				.filter((b) => b.type === 'text')
				.map((b) => b.text)
				.join('');
			return { role: 'assistant', content: text || null, contentBlocks: entry.content };
		}
		return {
			role: 'tool',
			toolUseId: entry.toolUseId,
			isError: entry.isError,
			content: entry.content
				.map((c) => (c.type === 'text' ? c.text : '[binary]'))
				.join('\n'),
		};
	});
}

export class AssistantIpc implements IpcModule {
	readonly name = 'assistant';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const assistant = container.get('assistantService');

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
			wrapSimpleHandler((id: string, decision: ApprovalDecision | boolean): boolean => {
				return assistant.resolveApproval(id, decision);
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
