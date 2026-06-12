import type { JSONSchema, ToolContextState } from './types';

export class ToolContext {
	private readonly state: ToolContextState = {};

	get path(): string | undefined {
		return this.state.path;
	}

	setPath(path: string): void {
		this.state.path = path;
	}

	snapshot(): ToolContextState {
		return { ...this.state };
	}
}

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	constructor(readonly context = new ToolContext()) {}

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}
