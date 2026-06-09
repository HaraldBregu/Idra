export type Unsubscribe = () => void;

export class Observable<TEvent> {
	private subscribers: Array<(event: TEvent) => void> = [];

	protected subscribe(callback: (event: TEvent) => void): Unsubscribe {
		this.subscribers.push(callback);
		return () => {
			this.subscribers = this.subscribers.filter((cb) => cb !== callback);
		};
	}

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
