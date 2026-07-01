import type { JSONSchema } from './types';
import type { CronFunctionId } from '../cron/cron';

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
	abstract readonly description: string;
	abstract readonly schema: JSONSchema;
	constructor(readonly context: Context) {}
	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}

export abstract class BaseTool extends Tool {
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly schema: JSONSchema;
}

export abstract class CronTool extends Tool {
	abstract readonly name: CronFunctionId;
	abstract readonly description: string;
	abstract readonly schema: JSONSchema;
	constructor(readonly cron: Cron, context: Context) {
		super(context);
	}
}