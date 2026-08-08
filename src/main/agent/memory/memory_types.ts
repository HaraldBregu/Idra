export const MAX_MEMORY_FACT_LENGTH = 500;

export interface MemoryFact {
	id: string;
	fact: string;
}

export interface StoredMemoryFact extends MemoryFact {
	lineIndex: number;
}
