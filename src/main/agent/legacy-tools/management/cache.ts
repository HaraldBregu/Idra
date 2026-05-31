import type { PrivacyLevel } from './types';

export interface ToolCacheEntry<TValue = unknown> {
	key: string;
	value: TValue;
	createdAt: string;
	expiresAt: string;
	sourceToolId: string;
	privacyLevel: PrivacyLevel;
}

export class ToolCache {
	private readonly entries = new Map<string, ToolCacheEntry>();

	get<TValue>(key: string, now = new Date()): ToolCacheEntry<TValue> | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (Date.parse(entry.expiresAt) <= now.getTime()) {
			this.entries.delete(key);
			return undefined;
		}
		return entry as ToolCacheEntry<TValue>;
	}

	set<TValue>(entry: ToolCacheEntry<TValue>): boolean {
		if (entry.privacyLevel === 'private' || entry.privacyLevel === 'sensitive') return false;
		if (Date.parse(entry.expiresAt) <= Date.parse(entry.createdAt)) return false;
		this.entries.set(entry.key, entry);
		return true;
	}

	delete(key: string): boolean {
		return this.entries.delete(key);
	}

	clear(): void {
		this.entries.clear();
	}
}

