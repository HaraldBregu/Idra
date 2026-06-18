import { Tool } from '../../agent/core/tool';
import type { JSONSchema } from '../../llm/types';
import type { CronService } from '../service';
import { CRON_FUNCTIONS, type CronFunctionDefinition, type CronFunctionId, type CronFunctionInput } from './registry';
import { CRON_FUNCTION_SCHEMAS } from './tooldata';

class CronTool extends Tool {
	readonly name: CronFunctionId;
	readonly description: string;
	readonly schema: JSONSchema;

	constructor(
		private readonly service: CronService,
		definition: CronFunctionDefinition
	) {
		super();
		this.name = definition.id;
		this.description = definition.description;
		this.schema = CRON_FUNCTION_SCHEMAS[definition.id];
	}

	run(input: Record<string, unknown>): unknown {
		return this.service.invoke(this.name, input as CronFunctionInput[CronFunctionId]);
	}
}

export function createCronTools(service: CronService): Tool[] {
	return CRON_FUNCTIONS.map((fn) => new CronTool(service, fn));
}
