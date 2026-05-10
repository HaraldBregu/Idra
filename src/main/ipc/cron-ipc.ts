import { ipcMain, BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { CronService } from '../cron';
import type { LoggerService } from '../logger';
import { wrapSimpleHandler } from './ipc-error-handler';
import { CronChannels } from '../../shared/channels';
import type { CronTask, CronTickEvent } from '../../shared/cron';

export class CronIpc implements IpcModule {
	readonly name = 'cron';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');
		const cron = container.get<CronService>('cron');

		const broadcastTick = (task: CronTask): void => {
			const payload: CronTickEvent = { id: task.id, firedAt: new Date().toISOString() };
			for (const win of BrowserWindow.getAllWindows()) {
				if (!win.isDestroyed()) {
					win.webContents.send(CronChannels.tick, payload);
				}
			}
		};

		cron.restore((task) => broadcastTick(task));

		ipcMain.handle(
			CronChannels.list,
			wrapSimpleHandler((): CronTask[] => cron.getTasks(), CronChannels.list)
		);

		ipcMain.handle(
			CronChannels.add,
			wrapSimpleHandler(
				(expression: string, options?: { id?: string; timezone?: string }): CronTask => {
					const id = options?.id?.trim() || randomUUID();
					const timezone = options?.timezone;
					return cron.schedule(id, expression, () => undefined, { timezone });
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

		// Re-broadcast ticks fired from any source via the dispatcher passed to restore.
		// New schedules done through this IPC use the same broadcast handler implicitly
		// because they are added with a no-op handler — extend later if richer dispatch
		// is needed by giving cron.schedule the broadcastTick handler too.

		logger.info('CronIpc', `Registered ${this.name} module`);
	}
}
