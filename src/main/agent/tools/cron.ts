import { CronTool } from '../core/tool';
import type { Context } from '../core/tool';
import type {
	Cron,
	CronFunctionDefinition,
	CronFunctionId,
	CronFunctionInput,
} from '../core/cron';
import type { JSONSchema } from '../core/types';

export class CronFunctionTool extends CronTool {
	readonly name: CronFunctionId;
	readonly description: string;
	readonly schema: JSONSchema;

	constructor(cron: Cron, context: Context, definition: CronFunctionDefinition) {
		super(cron, context);
		this.name = definition.id;
		this.description = definition.description;
		this.schema = { type: 'object', properties: {}, additionalProperties: true };
	}

	run(input: Record<string, unknown>): unknown {
		return this.cron.invoke(this.name, input as CronFunctionInput[CronFunctionId]);
	}
}
