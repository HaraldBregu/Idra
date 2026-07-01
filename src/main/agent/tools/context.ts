import { Context, type ContextState } from '../types';

export class ToolContext extends Context {
	private readonly state: ContextState = {};

	get path(): string | undefined {
		return this.state.path;
	}

	setPath(path: string): void {
		this.state.path = path;
	}

	snapshot(): ContextState {
		return { ...this.state };
	}
}
