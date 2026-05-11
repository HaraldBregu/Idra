import { randomUUID } from 'node:crypto';
import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { CronService } from '../cron';
import type { LoggerService } from '../logger';
import { wrapSimpleHandler } from './ipc-error-handler';
import { CronChannels } from '../../shared/channels';
import { isCronTaskData, type CronTask, type CronTaskData, type CronTaskView } from '../../shared/cron';

export class CronIpc implements IpcModule {
	readonly name = 'cron';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');
		const cron = container.get<CronService>('cron');

		ipcMain.handle(
			CronChannels.list,
			wrapSimpleHandler((): CronTaskView[] => {
				return cron.getTasks();
			}, CronChannels.list)
		);

		ipcMain.handle(
			CronChannels.add,
			wrapSimpleHandler(
				(
					expression: string,
					data: CronTaskData,
					options?: { id?: string; timezone?: string }
				): CronTask => {
					if (!isCronTaskData(data)) {
						throw new Error('Invalid cron task data: missing string "type" discriminator');
					}
					const id = options?.id ?? randomUUID();
					return cron.schedule(
						id,
						expression,
						data,
						() => {
							logger.info('CronService', `Tick: ${id} '${expression}' — [${data.type}]`);
						},
						{ timezone: options?.timezone }
					);
				},
				CronChannels.add
			)
		);

		ipcMain.handle(
			CronChannels.remove,
			wrapSimpleHandler((id: string): void => {
				cron.unschedule(id);
			}, CronChannels.remove)
		);

		logger.info('CronIpc', `Registered ${this.name} module`);
	}
}
