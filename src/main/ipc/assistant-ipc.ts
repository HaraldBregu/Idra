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
	AssistantPendingInput,
	AssistantSendResult,
} from '../../shared/service';

function toSendResult(result: {
	status: AssistantSendResult['status'];
	text: string;
	pending: { callId: string; toolName: string; arguments: string }[];
	pendingInputs: {
		callId: string;
		toolName: string;
		question: string;
		suggestions?: string[];
	}[];
}): AssistantSendResult {
	return {
		status: result.status,
		text: result.text,
		pending: result.pending.map((p) => ({
			callId: p.callId,
			toolName: p.toolName,
			arguments: p.arguments,
		})),
		pendingInputs: result.pendingInputs.map((p) => ({
			callId: p.callId,
			toolName: p.toolName,
			question: p.question,
			suggestions: p.suggestions,
		})),
	};
}

export class AssistantIpc implements IpcModule {
	readonly name = 'assistant';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');
		const assistant = container.get<AssistantService>('assistantService');

		ipcMain.handle(
			AssistantChannels.send,
			wrapSimpleHandler(async (message: string): Promise<AssistantSendResult> => {
				const text = await assistant.send(message);
				const pendingApprovals = assistant.getPendingApprovals();
				const pendingInputs = assistant.getPendingInputs();
				const status: AssistantSendResult['status'] = pendingApprovals.length
					? 'awaiting_approval'
					: pendingInputs.length
						? 'awaiting_input'
						: 'completed';
				return {
					status,
					text,
					pending: pendingApprovals.map((p) => ({
						callId: p.callId,
						toolName: p.toolName,
						arguments: p.arguments,
					})),
					pendingInputs: pendingInputs.map((p) => ({
						callId: p.callId,
						toolName: p.toolName,
						question: p.question,
						suggestions: p.suggestions,
					})),
				};
			}, AssistantChannels.send)
		);

		ipcMain.handle(
			AssistantChannels.reset,
			wrapSimpleHandler(() => assistant.reset(), AssistantChannels.reset)
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
					opts?: { alwaysApprove?: boolean; editedArguments?: string }
				): Promise<AssistantSendResult> => {
					return toSendResult(await assistant.approve(callId, opts ?? {}));
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
					return toSendResult(await assistant.reject(callId, opts ?? {}));
				},
				AssistantChannels.reject
			)
		);

		ipcMain.handle(
			AssistantChannels.respond,
			wrapSimpleHandler(
				async (callId: string, answer: string): Promise<AssistantSendResult> => {
					return toSendResult(await assistant.respond(callId, answer));
				},
				AssistantChannels.respond
			)
		);

		ipcMain.handle(
			AssistantChannels.cancelPending,
			wrapSimpleHandler(() => assistant.cancelPending(), AssistantChannels.cancelPending)
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

		ipcMain.handle(
			AssistantChannels.getPendingInputs,
			wrapSimpleHandler((): AssistantPendingInput[] => {
				return assistant.getPendingInputs().map((p) => ({
					callId: p.callId,
					toolName: p.toolName,
					question: p.question,
					suggestions: p.suggestions,
				}));
			}, AssistantChannels.getPendingInputs)
		);

		logger.info('AssistantIpc', `Registered ${this.name} module`);
	}
}
