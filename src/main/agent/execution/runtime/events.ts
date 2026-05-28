import type { AgentHarnessEvent } from './types';

export class AgentHarnessEmitter {
	private readonly listeners = new Map<AgentHarnessEvent['type'], Set<(event: AgentHarnessEvent) => void>>();
	private readonly anyListeners = new Set<(event: AgentHarnessEvent) => void>();
	on(type: AgentHarnessEvent['type'], handler: (event: AgentHarnessEvent) => void): () => void {
		const set = this.listeners.get(type) ?? new Set();
		set.add(handler);
		this.listeners.set(type, set);
		return () => set.delete(handler);
	}
	onAny(handler: (event: AgentHarnessEvent) => void): () => void {
		this.anyListeners.add(handler);
		return () => this.anyListeners.delete(handler);
	}
	emit(event: AgentHarnessEvent): void {
		this.listeners.get(event.type)?.forEach((handler) => handler(event));
		this.anyListeners.forEach((handler) => handler(event));
	}
}

export class AgentHarnessEventQueue implements AsyncIterable<AgentHarnessEvent> {
	private readonly events: AgentHarnessEvent[] = [];
	private readonly waiters: Array<(value: IteratorResult<AgentHarnessEvent>) => void> = [];
	private closed = false;
	push(event: AgentHarnessEvent): void {
		const waiter = this.waiters.shift();
		if (waiter) waiter({ done: false, value: event });
		else this.events.push(event);
	}
	close(): void {
		this.closed = true;
		this.waiters.splice(0).forEach((waiter) => waiter({ done: true, value: undefined }));
	}
	[Symbol.asyncIterator](): AsyncIterator<AgentHarnessEvent> {
		return {
			next: () => {
				const event = this.events.shift();
				if (event) return Promise.resolve({ done: false, value: event });
				if (this.closed) return Promise.resolve({ done: true, value: undefined });
				return new Promise((resolve) => this.waiters.push(resolve));
			},
		};
	}
}
