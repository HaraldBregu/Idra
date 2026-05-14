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
	AssistantPendingApproval,
	AssistantSendResult,
} from '../../shared/service';

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
			wrapSimpleHandler(() => {
				return assistant.reset();
			}, AssistantChannels.reset)
		);

		ipcMain.handle(
			AssistantChannels.getHistory,
			wrapSimpleHandler(async (): Promise<AssistantHistoryMessage[]> => {
				const history = await assistant.getHistory();
				return history as unknown as AssistantHistoryMessage[];
			}, AssistantChannels.getHistory)
		);

		ipcMain.handle(
			AssistantChannels.approve,
			wrapSimpleHandler(
				async (
					callId: string,
					opts?: { alwaysApprove?: boolean }
				): Promise<AssistantSendResult> => {
					const result = await assistant.approve(callId, opts ?? {});
					return {
						status: result.status,
						text: result.text,
						pending: result.pending.map((p) => ({
							callId: p.callId,
							toolName: p.toolName,
							arguments: p.arguments,
						})),
					};
				},
				AssistantChannels.approve
			)
		);

		ipcMain.handle(
			AssistantChannels.reject,
			wrapSimpleHandler(
				async (
					callId: string,
					opts?: { alwaysReject?: boolean; message?: string }
				): Promise<AssistantSendResult> => {
					const result = await assistant.reject(callId, opts ?? {});
					return {
						status: result.status,
						text: result.text,
						pending: result.pending.map((p) => ({
							callId: p.callId,
							toolName: p.toolName,
							arguments: p.arguments,
						})),
					};
				},
				AssistantChannels.reject
			)
		);

		ipcMain.handle(
			AssistantChannels.getPending,
			wrapSimpleHandler((): AssistantPendingApproval[] => {
				return assistant.getPendingApprovals().map((p) => ({
					callId: p.callId,
					toolName: p.toolName,
					arguments: p.arguments,
				}));
			}, AssistantChannels.getPending)
		);

		logger.info('AssistantIpc', `Registered ${this.name} module`);
	}
}
