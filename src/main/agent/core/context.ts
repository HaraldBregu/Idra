export interface ToolContextState {
	path?: string;
}

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
