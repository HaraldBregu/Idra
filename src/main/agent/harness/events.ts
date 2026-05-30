import type { AgentHarnessEvent } from './types';

export class AgentHarnessEmitter {
	private readonly listeners = new Map<AgentHarnessEvent['type'], Set<(event: AgentHarnessEvent) => void>>();
	private readonly anyListeners = new Set<(event: AgentHarnessEvent) => void>();

	on(type: AgentHarnessEvent['type'], handler: (event: AgentHarnessEvent) => void): () => void {
		const listeners = this.listeners.get(type) ?? new Set();
		listeners.add(handler);
		this.listeners.set(type, listeners);
		return () => {
			listeners.delete(handler);
			if (listeners.size === 0) this.listeners.delete(type);
		};
	}

	onAny(handler: (event: AgentHarnessEvent) => void): () => void {
		this.anyListeners.add(handler);
		return () => this.anyListeners.delete(handler);
	}

	emit(event: AgentHarnessEvent): void {
		for (const handler of this.anyListeners) {
			handler(event);
		}
		for (const handler of this.listeners.get(event.type) ?? []) {
			handler(event);
		}
	}
}

export class AgentHarnessEventQueue implements AsyncIterable<AgentHarnessEvent> {
	private readonly events: AgentHarnessEvent[] = [];
	private readonly waiters: Array<(result: IteratorResult<AgentHarnessEvent>) => void> = [];
	private closed = false;

	push(event: AgentHarnessEvent): void {
		if (this.closed) return;
		const waiter = this.waiters.shift();
		if (waiter) {
			waiter({ done: false, value: event });
			return;
		}
		this.events.push(event);
	}

	close(): void {
		if (this.closed) return;
		this.closed = true;
		for (const waiter of this.waiters.splice(0)) {
			waiter({ done: true, value: undefined });
		}
	}

	[Symbol.asyncIterator](): AsyncIterator<AgentHarnessEvent> {
		return {
			next: () => {
				const event = this.events.shift();
				if (event) return Promise.resolve({ done: false, value: event });
				if (this.closed) return Promise.resolve({ done: true, value: undefined });
				return new Promise<IteratorResult<AgentHarnessEvent>>((resolve) => this.waiters.push(resolve));
			},
		};
	}
}
