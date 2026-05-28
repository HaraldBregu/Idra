import type { AgentRuntimeEvent } from './types';

export class AgentRuntimeEmitter {
	private readonly listeners = new Map<AgentRuntimeEvent['type'], Set<(event: AgentRuntimeEvent) => void>>();
	private readonly anyListeners = new Set<(event: AgentRuntimeEvent) => void>();
	on(type: AgentRuntimeEvent['type'], handler: (event: AgentRuntimeEvent) => void): () => void {
		const set = this.listeners.get(type) ?? new Set();
		set.add(handler);
		this.listeners.set(type, set);
		return () => set.delete(handler);
	}
	onAny(handler: (event: AgentRuntimeEvent) => void): () => void {
		this.anyListeners.add(handler);
		return () => this.anyListeners.delete(handler);
	}
	emit(event: AgentRuntimeEvent): void {
		this.listeners.get(event.type)?.forEach((handler) => handler(event));
		this.anyListeners.forEach((handler) => handler(event));
	}
}

export class AgentRuntimeEventQueue implements AsyncIterable<AgentRuntimeEvent> {
	private readonly events: AgentRuntimeEvent[] = [];
	private readonly waiters: Array<(value: IteratorResult<AgentRuntimeEvent>) => void> = [];
	private closed = false;
	push(event: AgentRuntimeEvent): void {
		const waiter = this.waiters.shift();
		if (waiter) waiter({ done: false, value: event });
		else this.events.push(event);
	}
	close(): void {
		this.closed = true;
		this.waiters.splice(0).forEach((waiter) => waiter({ done: true, value: undefined }));
	}
	[Symbol.asyncIterator](): AsyncIterator<AgentRuntimeEvent> {
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
