import type { AgentTool } from '../common';
import { markLspTool } from '../common';
import { asParamsRecord, readNumberParam, readStringParam } from '../params';
import { jsonResult } from '../results';

export type LspCapability = 'hover' | 'definition' | 'references';

export type LspRuntime = {
	capabilities: readonly LspCapability[];
	hover?: (input: LspPositionInput, signal?: AbortSignal) => Promise<unknown>;
	definition?: (input: LspPositionInput, signal?: AbortSignal) => Promise<unknown>;
	references?: (input: LspPositionInput, signal?: AbortSignal) => Promise<unknown>;
	dispose?: () => Promise<void> | void;
};

export type LspPositionInput = {
	path: string;
	line: number;
	character: number;
};

export type MaterializeLspToolsOptions = {
	runtime?: LspRuntime;
};

const POSITION_SCHEMA = {
	type: 'object',
	properties: {
		path: { type: 'string' },
		line: { type: 'number' },
		character: { type: 'number' },
	},
	required: ['path', 'line', 'character'],
	additionalProperties: false,
};

export async function materializeLspTools(options: MaterializeLspToolsOptions): Promise<AgentTool[]> {
	if (!options.runtime) return [];
	const tools: AgentTool[] = [];
	if (options.runtime.capabilities.includes('hover') && options.runtime.hover) {
		tools.push(createLspPositionTool('lsp_hover', 'Return hover information for a source location.', options.runtime.hover));
	}
	if (options.runtime.capabilities.includes('definition') && options.runtime.definition) {
		tools.push(createLspPositionTool('lsp_definition', 'Return definition locations for a source symbol.', options.runtime.definition));
	}
	if (options.runtime.capabilities.includes('references') && options.runtime.references) {
		tools.push(createLspPositionTool('lsp_references', 'Return reference locations for a source symbol.', options.runtime.references));
	}
	return tools.map(markLspTool);
}

function createLspPositionTool(
	name: string,
	description: string,
	handler: (input: LspPositionInput, signal?: AbortSignal) => Promise<unknown>
): AgentTool {
	return {
		name,
		description,
		parameters: POSITION_SCHEMA,
		async execute(_toolCallId, params, signal) {
			const record = asParamsRecord(params);
			const input = {
				path: readStringParam(record, 'path', { required: true, minLength: 1 })!,
				line: readNumberParam(record, 'line', { required: true, min: 0, integer: true })!,
				character: readNumberParam(record, 'character', { required: true, min: 0, integer: true })!,
			};
			return jsonResult(await handler(input, signal));
		},
	};
}

