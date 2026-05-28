import type { PolicyConfig } from '../../shared/policy';
import { PolicyChannels } from '../../shared/ipc-channels';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../app/service-registry';
import type { IpcModule } from './ipc-module';
import { registerCommand, registerQuery } from './ipc-gateway';

export class PolicyIpc implements IpcModule {
	readonly name = 'policy';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const policy = container.get('policy');
		const logger = container.get('logger');

		const handleWithPolicyLogging = <T>(operation: string, handler: () => T): T => {
			try {
				return handler();
			} catch (error) {
				const normalizedError =
					error instanceof Error ? error.message : String(error);
				logger.error('PolicyIpc', `Failed to ${operation} policy configuration`, {
					error: normalizedError,
				});
				throw error;
			}
		};

		registerQuery(
			PolicyChannels.get,
			(): PolicyConfig => handleWithPolicyLogging('read', () => policy.getPolicy())
		);

		registerCommand(
			PolicyChannels.set,
			(config: PolicyConfig): PolicyConfig =>
				handleWithPolicyLogging('replace', () => policy.setPolicy(config))
		);

		logger.info('PolicyIpc', `Registered ${this.name} module`);
	}
}
