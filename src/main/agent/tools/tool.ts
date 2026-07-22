import { z } from 'zod';
import type { JSONSchema, JsonToolConfig, Tool, ToolConfig } from '../types';

function toJsonSchema(schema: z.ZodType): JSONSchema {
	const jsonSchema = { ...z.toJSONSchema(schema) } as JSONSchema;
	delete jsonSchema.$schema;
	return jsonSchema;
}

export function tool<T extends z.ZodType>({
	name,
	description,
	defaultPermission,
	alwaysAsk,
	stopOnReject,
	confirmDetail,
	inputSchema,
	execute,
}: ToolConfig<T>): Tool {
	return {
		name,
		description,
		defaultPermission,
		alwaysAsk,
		stopOnReject,
		confirmDetail,
		schema: toJsonSchema(inputSchema),
		async run(input: Record<string, unknown>, signal?: AbortSignal) {
			return execute(inputSchema.parse(input), signal);
		},
	};
}

export function jsonTool({
	name,
	description,
	defaultPermission,
	schema,
	execute,
}: JsonToolConfig): Tool {
	return {
		name,
		description,
		defaultPermission,
		schema,
		async run(input: Record<string, unknown>, signal?: AbortSignal) {
			return execute(input, signal);
		},
	};
}
