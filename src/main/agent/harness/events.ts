import type { AgentHarnessEvent } from './types';

export class AgentHarnessEmitter {
	private readonly listeners = new Map<AgentHarnessEvent['type'], Set<(event: AgentHarnessEvent) => void>>();

	on(type: AgentHarnessEvent['type'], handler: (event: AgentHarnessEvent) => void): () => void {
		const listeners = this.listeners.get(type) ?? new Set();
		listeners.add(handler);
		this.listeners.set(type, listeners);
		return () => {
			listeners.delete(handler);
			if (listeners.size === 0) this.listeners.delete(type);
		};
	}

	emit(event: AgentHarnessEvent): void {
		for (const handler of this.listeners.get(event.type) ?? []) {
			handler(event);
		}
	}
}
