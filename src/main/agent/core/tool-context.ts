export interface ToolContextState {
	path?: string;
}

export class ToolContext {
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
