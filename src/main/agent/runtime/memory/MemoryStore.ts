export type MemoryStore = {
	retrieve(query: string): Promise<string[]>;
	store(text: string): Promise<void>;
};
