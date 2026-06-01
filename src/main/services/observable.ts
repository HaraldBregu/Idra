/**
 * Unsubscribe function returned by Observable.subscribe()
 */
export type Unsubscribe = () => void;

/**
 * Base class for services that emit events to subscribers.
 * Provides consistent subscription/unsubscription pattern and automatic error handling.
 *
 * @example
 * ```typescript
 * export class MyService extends Observable<MyEvent> {
 *   doSomething() {
 *     const event: MyEvent = { type: 'something-happened', data: '...' }
 *     this.notify(event)
 *   }
 *
 *   onEvent(callback: (event: MyEvent) => void): Unsubscribe {
 *     return this.subscribe(callback)
 *   }
 *
 *   cleanup() {
 *     this.clearSubscribers()
 *   }
 * }
 * ```
 */
export class Observable<TEvent> {
	private subscribers: Array<(event: TEvent) => void> = [];

	/**
	 * Subscribe to events from this observable.
	 * Returns an unsubscribe function to remove the subscription.
	 *
	 * @param callback - Function to call when events are emitted
	 * @returns Unsubscribe function
	 */
	protected subscribe(callback: (event: TEvent) => void): Unsubscribe {
		this.subscribers.push(callback);
		return () => {
			this.subscribers = this.subscribers.filter((cb) => cb !== callback);
		};
	}

	/**
	 * Notify all subscribers of an event.
	 * Errors in subscriber callbacks are caught and logged to prevent cascading failures.
	 *
	 * @param event - The event to emit to subscribers
	 */
	protected notify(event: TEvent): void {
		this.subscribers.forEach((callback) => {
			try {
				callback(event);
			} catch (err) {
				console.error('[Observable] Subscriber error:', err);
			}
		});
	}

	/**
	 * Clear all subscribers.
	 * Should be called during service cleanup to prevent memory leaks.
	 */
	protected clearSubscribers(): void {
		this.subscribers = [];
	}

	/**
	 * Get the current number of subscribers (useful for debugging)
	 */
	protected getSubscriberCount(): number {
		return this.subscribers.length;
	}
}
