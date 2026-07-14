import { z } from 'zod';
import { restrictedToolDir } from '../policy';
import type { JSONSchema, JsonToolConfig, Tool, ToolConfig } from '../types';

function toJsonSchema(schema: z.ZodType): JSONSchema {
	const jsonSchema = { ...z.toJSONSchema(schema) } as JSONSchema;
	delete jsonSchema.$schema;
	return jsonSchema;
}

function assertNotRestricted(name: string, input: Record<string, unknown>): void {
	const restricted = restrictedToolDir(name, input);
	if (restricted)
		throw new Error(`'${restricted}' is a restricted directory; '${name}' is not allowed there`);
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
			assertNotRestricted(name, input);
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
			assertNotRestricted(name, input);
			return execute(input);
		},
	};
}
