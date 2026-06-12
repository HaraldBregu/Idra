import type { JSONSchema, ToolContextState } from './types';

export class ToolContext {
	private readonly state: ToolContextState;

	constructor(initialState: Partial<ToolContextState> = {}) {
		this.state = {
			path: initialState.path,
		};
	}

	get path(): string | undefined {
		return this.state.path;
	}

	setPath(path: string): void {
		this.state.path = path;
	}

	snapshot(): ToolContextState {
		return {
			path: this.state.path,
		};
	}
}

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	constructor(readonly context = new ToolContext()) {}

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}
