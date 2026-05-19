type TrayChatMessageListener = (message: string) => void;

const listeners = new Set<TrayChatMessageListener>();
const pendingMessages: string[] = [];

export function publishTrayChatMessage(message: string): void {
	const trimmed = message.trim();
	if (!trimmed) return;

	if (listeners.size === 0) {
		pendingMessages.push(trimmed);
		return;
	}

	for (const listener of listeners) {
		listener(trimmed);
	}
}

export function subscribeTrayChatMessage(listener: TrayChatMessageListener): () => void {
	listeners.add(listener);

	while (pendingMessages.length > 0) {
		const message = pendingMessages.shift();
		if (message) listener(message);
	}

	return () => {
		listeners.delete(listener);
	};
}
