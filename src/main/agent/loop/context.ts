import type { ToolContextState } from '../core/types';

export abstract class Context {
	protected readonly state: ToolContextState = {};

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

export class ToolContext extends Context {}
