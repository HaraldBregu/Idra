import type { JSONSchema } from './types';
import type { Cron, CronFunctionId } from './cron';


export interface ContextState {
	path?: string;
}

export abstract class Context {
	abstract get path(): string | undefined;
	abstract setPath(path: string): void;
	abstract snapshot(): ContextState;
}

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	constructor(readonly context?: Context) {}

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}

export abstract class CronTool extends Tool {
	abstract readonly name: CronFunctionId;
	abstract readonly description: string;
	abstract readonly schema: JSONSchema;

	constructor(readonly cron: Cron, context: Context) {
		super(context);
	}
}

export abstract class ToolData {
	abstract tools(): Tool[];
}
