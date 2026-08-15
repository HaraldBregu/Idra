import { z } from 'zod';
import type { JSONSchema, Tool, ToolConfig } from '../types';

function toJsonSchema(schema: z.ZodType): JSONSchema {
	const jsonSchema = { ...z.toJSONSchema(schema) } as JSONSchema;
	delete jsonSchema.$schema;
	return jsonSchema;
}

export function tool<T extends z.ZodType>({
	id,
	name,
	description,
	inputSchema,
	execute,
}: ToolConfig<T>): Tool {
	return {
		id,
		name,
		description,
		schema: toJsonSchema(inputSchema),
		parseInput(input: unknown) {
			return inputSchema.parse(input) as Record<string, unknown>;
		},
		run(input: Record<string, unknown>) {
			return execute(inputSchema.parse(input));
		},
	};
}
