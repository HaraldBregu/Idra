import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { StoreChannels } from '../../shared/ipc-channels';
import type { PolicyConfig } from '../../shared/policy';
import type { PublicProvider } from '../../shared/providers';

export class StoreIpc implements IpcModule {
	readonly name = 'store';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const store = container.get('store');
		const logger = container.get('logger');

		ipcMain.handle(
			StoreChannels.getProviders,
			wrapSimpleHandler((): PublicProvider[] => {
				return store.getProviders().map(({ apiKey: _apiKey, ...provider }) => provider);
			}, StoreChannels.getProviders)
		);

		ipcMain.handle(
			StoreChannels.getPolicy,
			wrapSimpleHandler((): PolicyConfig => store.getPolicy(), StoreChannels.getPolicy)
		);

		ipcMain.handle(
			StoreChannels.setPolicy,
			wrapSimpleHandler(
				(policy: PolicyConfig): PolicyConfig => store.setPolicy(policy),
				StoreChannels.setPolicy
			)
		);

		logger.info('StoreIpc', `Registered ${this.name} module`);
	}
}
