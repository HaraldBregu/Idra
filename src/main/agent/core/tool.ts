import type { JSONSchema } from './types';
import { Context } from './context';

class DefaultContext extends Context {}

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	constructor(readonly context = new DefaultContext()) {}

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}
