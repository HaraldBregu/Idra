import { BrowserWindow } from 'electron';
import { registerCommand } from './ipc-gateway';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import { DEFAULT_ASSISTANT_ID, type AssistantService } from '../assistant';

/**
 * IPC for the assistant subsystem.
 *  - assistant:send  (invoke) -- send a message, returns assistant text
 *  - assistant:reset (invoke) -- clear conversation history
 *  - assistant:response (event) -- pushed to all renderers when a reply lands
 */
export class AssistantIpc implements IpcModule {
	readonly name = 'AssistantIpc';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');
		const assistant = container.get<AssistantService>('assistant');

		registerCommand('assistant:send', async (message: string, assistantId?: string) => {
			const id = assistantId ?? DEFAULT_ASSISTANT_ID;
			const response = await assistant.send(message, id);

			const event = { assistantId: id, userMessage: message, response };
			for (const win of BrowserWindow.getAllWindows()) {
				win.webContents.send('assistant:response', event);
			}
			return response;
		});

		registerCommand('assistant:reset', async (assistantId?: string) => {
			await assistant.reset(assistantId ?? DEFAULT_ASSISTANT_ID);
		});

		logger.info('AssistantIpc', `Registered ${this.name} module`);
	}
}
