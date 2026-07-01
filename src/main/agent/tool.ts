import { z } from 'zod';
import type { JSONSchema, Tool } from './types';

type ToolConfig<T extends z.ZodType> = {
	name: string;
	description: string;
	inputSchema: T;
	execute: (input: z.infer<T>) => Promise<unknown> | unknown;
};

type JsonToolConfig = {
	name: string;
	description: string;
	schema: JSONSchema;
	execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
};

function toJsonSchema(schema: z.ZodType): JSONSchema {
	const jsonSchema = { ...z.toJSONSchema(schema) } as JSONSchema;
	delete jsonSchema.$schema;
	return jsonSchema;
}

export function tool<T extends z.ZodType>({
	name,
	description,
	inputSchema,
	execute,
}: ToolConfig<T>): Tool {
	return {
		name,
		description,
		schema: toJsonSchema(inputSchema),
		async run(input: Record<string, unknown>) {
			return execute(inputSchema.parse(input));
		},
	};
}

export function jsonTool({ name, description, schema, execute }: JsonToolConfig): Tool {
	return {
		name,
		description,
		schema,
		async run(input: Record<string, unknown>) {
			return execute(input);
		},
	};
}
