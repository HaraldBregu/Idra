type Listener = (channel: string, data: unknown) => void;

const listeners = new Set<Listener>();

/** Mirror a main -> renderer broadcast to every connected API event stream. */
export function publish(channel: string, data: unknown): void {
	for (const listener of listeners) {
		try {
			listener(channel, data);
		} catch (error) {
			console.error('[Api] Event listener failed:', error);
		}
	}
}

export function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	return (): void => {
		listeners.delete(listener);
	};
}
