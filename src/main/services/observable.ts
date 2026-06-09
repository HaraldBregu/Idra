/**
 * Unsubscribe function returned by Observable.subscribe()
 */
export type Unsubscribe = () => void;

export class Observable<TEvent> {
	private subscribers: Array<(event: TEvent) => void> = [];

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
