import { ipcMain } from 'electron';
import type { PolicyConfig } from '../../shared/policy';
import { PolicyChannels } from '../../shared/ipc-channels';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import type { IpcModule } from './ipc-module';
import { wrapSimpleHandler } from './ipc-error-handler';

export class PolicyIpc implements IpcModule {
	readonly name = 'policy';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const policy = container.get('policy');
		const logger = container.get('logger');

		ipcMain.handle(
			PolicyChannels.get,
			wrapSimpleHandler((): PolicyConfig => policy.getPolicy(), PolicyChannels.get)
		);

		ipcMain.handle(
			PolicyChannels.set,
			wrapSimpleHandler(
				(config: PolicyConfig): PolicyConfig => policy.setPolicy(config),
				PolicyChannels.set
			)
		);

		logger.info('PolicyIpc', `Registered ${this.name} module`);
	}
}
