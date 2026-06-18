import type { JSONSchema } from './types';
import { Context } from './context';

export class ToolContext extends Context {}

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	constructor(readonly context = new ToolContext()) {}

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}

export abstract class ToolData {
	abstract tools(): Tool[];
}
