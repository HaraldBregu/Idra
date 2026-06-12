import type { JSONSchema } from './types';
import { ToolContext } from '../loop/context';

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	constructor(readonly context = new ToolContext()) {}

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}
