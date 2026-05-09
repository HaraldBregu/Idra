import type { CronService } from '../cron';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import { Assistant } from './assistant';
import { DEFAULT_ASSISTANT_ID } from './constants';
import { AssistantRegistry } from './registry';

export interface AssistantServiceDependencies {
	store: StoreService;
	cron: CronService;
	logger: LoggerService;
}

export interface AssistantServiceOptions {
	defaultAssistantId?: string;
	registry?: AssistantRegistry;
}

export class AssistantService {
	private readonly defaultAssistantId: string;
	private readonly registry: AssistantRegistry;

	constructor(
		private readonly dependencies: AssistantServiceDependencies,
		options: AssistantServiceOptions = {}
	) {
		this.defaultAssistantId = options.defaultAssistantId ?? DEFAULT_ASSISTANT_ID;
		this.registry = options.registry ?? new AssistantRegistry();
		this.ensure(this.defaultAssistantId);
	}

	send(message: string, assistantId = this.defaultAssistantId): Promise<string> {
		return this.ensure(assistantId).send(message);
	}

	reset(assistantId = this.defaultAssistantId): Promise<void> {
		return this.ensure(assistantId).reset();
	}

	get(assistantId = this.defaultAssistantId): Assistant {
		return this.ensure(assistantId);
	}

	private ensure(assistantId: string): Assistant {
		if (!this.registry.has(assistantId)) {
			this.dependencies.logger.info('AssistantService', `Creating assistant "${assistantId}"`);
			this.registry.register(
				new Assistant(
					assistantId,
					this.dependencies.store,
					this.dependencies.cron,
					this.dependencies.logger
				)
			);
		}
		return this.registry.get(assistantId);
	}
}
