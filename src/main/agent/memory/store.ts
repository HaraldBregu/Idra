import type { Clock, MemoryItem, MemoryStore, UserMemory } from './types';
import { MemoryItemNotFoundError, MemoryStoreError } from './types';
import { deepClone, isArchived, isExpired, keywordScore, memorySearchText, nowIso } from './helpers';

export class InMemoryMemoryStore implements MemoryStore {
	private readonly memoryByUser = new Map<string, UserMemory>();

	constructor(private readonly clock: Clock = () => new Date()) {}

	async getMemory(userId: string): Promise<UserMemory> {
		const memory = this.ensureUserMemory(userId);
		this.pruneExpired(memory);
		return deepClone(memory);
	}

	async saveMemory(userId: string, memory: UserMemory): Promise<void> {
		if (memory.userId !== userId) {
			throw new MemoryStoreError(`Cannot save memory for ${memory.userId} under user ${userId}`);
		}

		const next = deepClone(memory);
		next.updatedAt = nowIso(this.clock);
		this.pruneExpired(next);
		this.memoryByUser.set(userId, next);
	}

	async searchMemory(userId: string, query: string): Promise<MemoryItem[]> {
		const memory = this.ensureUserMemory(userId);
		this.pruneExpired(memory);
		const now = nowIso(this.clock);
		const ranked = memory.longTerm.items
			.filter((item) => !isArchived(item) && !isExpired(item, this.clock))
			.map((item) => ({ item, score: keywordScore(query, memorySearchText(item)) }))
			.filter(({ score }) => score > 0)
			.sort((a, b) => b.score - a.score)
			.map(({ item }) => {
				item.lastAccessedAt = now;
				return item;
			});

		if (ranked.length > 0) {
			memory.updatedAt = now;
		}

		return deepClone(ranked);
	}

	async addMemory(userId: string, item: MemoryItem): Promise<void> {
		if (item.userId !== userId) {
			throw new MemoryStoreError(`Cannot add memory for ${item.userId} under user ${userId}`);
		}

		const memory = this.ensureUserMemory(userId);
		if (memory.longTerm.items.some((existing) => existing.id === item.id)) {
			throw new MemoryStoreError(`Memory item already exists: ${item.id}`);
		}

		const now = nowIso(this.clock);
		memory.longTerm.items.push({ ...deepClone(item), updatedAt: now });
		memory.updatedAt = now;
	}

	async updateMemory(userId: string, itemId: string, patch: Partial<MemoryItem>): Promise<void> {
		const memory = this.ensureUserMemory(userId);
		const index = memory.longTerm.items.findIndex((item) => item.id === itemId);
		if (index === -1) throw new MemoryItemNotFoundError(itemId);

		const existing = memory.longTerm.items[index]!;
		const now = nowIso(this.clock);
		memory.longTerm.items[index] = {
			...existing,
			...deepClone(patch),
			id: existing.id,
			userId: existing.userId,
			metadata: {
				...existing.metadata,
				...(patch.metadata ?? {}),
			},
			updatedAt: now,
		};
		memory.updatedAt = now;
	}

	async deleteMemory(userId: string, itemId: string): Promise<void> {
		const memory = this.ensureUserMemory(userId);
		const index = memory.longTerm.items.findIndex((item) => item.id === itemId);
		if (index === -1) throw new MemoryItemNotFoundError(itemId);

		const now = nowIso(this.clock);
		const [deleted] = memory.longTerm.items.splice(index, 1);
		if (deleted) {
			memory.longTerm.archivedItems.push({
				...deleted,
				updatedAt: now,
				metadata: {
					...deleted.metadata,
					archivedAt: now,
					archiveReason: 'deleted_by_user_or_policy',
				},
			});
		}
		memory.updatedAt = now;
	}

	async exportMemory(userId: string): Promise<UserMemory> {
		return this.getMemory(userId);
	}

	async deleteAllMemory(userId: string): Promise<void> {
		this.memoryByUser.delete(userId);
	}

	private ensureUserMemory(userId: string): UserMemory {
		const existing = this.memoryByUser.get(userId);
		if (existing) return existing;

		const now = nowIso(this.clock);
		const created: UserMemory = {
			userId,
			version: 1,
			createdAt: now,
			updatedAt: now,
			longTerm: {
				items: [],
				archivedItems: [],
			},
		};
		this.memoryByUser.set(userId, created);
		return created;
	}

	private pruneExpired(memory: UserMemory): void {
		const now = nowIso(this.clock);
		const active: MemoryItem[] = [];
		for (const item of memory.longTerm.items) {
			if (isExpired(item, this.clock)) {
				memory.longTerm.archivedItems.push({
					...item,
					updatedAt: now,
					metadata: {
						...item.metadata,
						archivedAt: now,
						archiveReason: 'expired',
					},
				});
			} else {
				active.push(item);
			}
		}
		memory.longTerm.items = active;
	}
}
