import type { JSONSchema } from './types';


export interface ToolContextState {
	path?: string;
}

export abstract class ToolContext {
	abstract get path(): string | undefined;
	abstract setPath(path: string): void;
	abstract snapshot(): ToolContextState;
}

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	constructor(readonly context: ToolContext) {}

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}

export abstract class ToolData {
	abstract tools(): Tool[];
}
