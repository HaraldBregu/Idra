import type { Clock, MemoryItem, MemoryPrivacyLevel, MemoryStore } from './types';
import { IMPORTANCE_RANK, isArchived, isExpired, keywordScore, memorySearchText, PRIVACY_RANK } from './helpers';

export interface MemorySearchStrategy {
	search(store: MemoryStore, userId: string, query: string): Promise<MemoryItem[]>;
}

export class KeywordMemorySearchStrategy implements MemorySearchStrategy {
	async search(store: MemoryStore, userId: string, query: string): Promise<MemoryItem[]> {
		return store.searchMemory(userId, query);
	}
}

export interface MemoryRetrievalInput {
	userId: string;
	query: string;
	maxItems?: number;
	maxCharacters?: number;
	maxPrivacyLevel?: MemoryPrivacyLevel;
}

export class MemoryRetriever {
	constructor(
		private readonly store: MemoryStore,
		private readonly searchStrategy: MemorySearchStrategy = new KeywordMemorySearchStrategy(),
		private readonly clock: Clock = () => new Date()
	) {}

	async retrieve(input: MemoryRetrievalInput): Promise<MemoryItem[]> {
		const maxItems = input.maxItems ?? 6;
		const maxCharacters = input.maxCharacters ?? 1800;
		const maxPrivacyLevel = input.maxPrivacyLevel ?? 'private';
		const [matches, memory] = await Promise.all([
			this.searchStrategy.search(this.store, input.userId, input.query),
			this.store.getMemory(input.userId),
		]);

		const durablePreferences = memory.longTerm.items.filter((item) =>
			['preference', 'workflow_instruction', 'project_context'].includes(item.kind)
		);
		const candidates = this.uniqueById([...matches, ...durablePreferences])
			.filter((item) => !isArchived(item) && !isExpired(item, this.clock))
			.filter((item) => PRIVACY_RANK[item.privacyLevel] <= PRIVACY_RANK[maxPrivacyLevel])
			.map((item) => ({ item, relevance: keywordScore(input.query, memorySearchText(item)) }))
			.filter(({ item, relevance }) => this.isUsefulForQuery(item, relevance))
			.map(({ item, relevance }) => ({ item, score: this.rankMemory(item, input.query, relevance) }))
			.sort((a, b) => b.score - a.score);

		const selected: MemoryItem[] = [];
		let usedCharacters = 0;
		for (const { item } of candidates) {
			const itemCharacters = item.summary.length + item.content.length;
			if (selected.length >= maxItems || usedCharacters + itemCharacters > maxCharacters) break;
			selected.push(item);
			usedCharacters += itemCharacters;
		}

		return selected;
	}

	private rankMemory(item: MemoryItem, query: string, relevance = keywordScore(query, memorySearchText(item))): number {
		const recency = this.recencyScore(item);
		const stablePreferenceBonus = relevance > 0 && ['preference', 'workflow_instruction'].includes(item.kind) ? 0.35 : 0;
		const globalWorkflowBonus = relevance === 0 && this.isGlobalWorkflowMemory(item) ? 0.5 : 0;
		return relevance * 2.5 + IMPORTANCE_RANK[item.importance] + item.confidence + recency + stablePreferenceBonus + globalWorkflowBonus;
	}

	private isUsefulForQuery(item: MemoryItem, relevance: number): boolean {
		if (relevance > 0) return true;
		return this.isGlobalWorkflowMemory(item);
	}

	private isGlobalWorkflowMemory(item: MemoryItem): boolean {
		return item.kind === 'workflow_instruction' || item.tags.includes('response_style');
	}

	private recencyScore(item: MemoryItem): number {
		const timestamp = Date.parse(item.lastAccessedAt || item.updatedAt || item.createdAt);
		if (Number.isNaN(timestamp)) return 0;
		const ageDays = Math.max(0, (this.clock().getTime() - timestamp) / 86_400_000);
		return Math.max(0, 0.5 - ageDays / 365);
	}

	private uniqueById(items: MemoryItem[]): MemoryItem[] {
		const seen = new Set<string>();
		const uniqueItems: MemoryItem[] = [];
		for (const item of items) {
			if (seen.has(item.id)) continue;
			seen.add(item.id);
			uniqueItems.push(item);
		}
		return uniqueItems;
	}
}
