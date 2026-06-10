import type { JSONSchema } from '../../llm/types';

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}
