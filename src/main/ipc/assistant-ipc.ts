import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { AssistantService } from '../assistant';
import type { LoggerService } from '../logger';
import { wrapSimpleHandler } from './ipc-error-handler';
import { AssistantChannels } from '../../shared/channels';
import type { AssistantHistoryMessage } from '../../shared/service';

export class AssistantIpc implements IpcModule {
	readonly name = 'assistant';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');
		const assistant = container.get<AssistantService>('assistantService');

		ipcMain.handle(
			AssistantChannels.send,
			wrapSimpleHandler((message: string) => {
				return assistant.send(message);
			}, AssistantChannels.send)
		);

		ipcMain.handle(
			AssistantChannels.reset,
			wrapSimpleHandler(() => {
				return assistant.reset();
			}, AssistantChannels.reset)
		);

		logger.info('AssistantIpc', `Registered ${this.name} module`);
	}
}
