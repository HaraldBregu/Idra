export type HistoryEntry = {
	type: string;
	data?: unknown;
	timestamp?: string;
};

export abstract class History {
	abstract create(sessionId: string): Promise<void>;
	abstract append(sessionId: string, entry: HistoryEntry): Promise<void>;
}
