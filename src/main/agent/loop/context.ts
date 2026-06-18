import { ToolContext } from '../core/tool';
import type { ToolContextState } from '../core/tool';

export class AgentContext extends ToolContext {
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
