import type {
	MemoryPolicy,
	MemoryRetriever,
	SkillExecutionContext,
	SkillMemoryKind,
	SkillMemoryRead,
	SkillMemoryWrite,
	SkillMemoryWriteDecision,
} from './types';
import type { SkillPreferenceStore } from './preferences';

const SECRET_MEMORY_KIND = /secret|credential|token|password|oauth/i;

export class NoopSkillMemoryRetriever implements MemoryRetriever {
	constructor(private readonly preferences: SkillPreferenceStore) {}

	async read(kind: SkillMemoryKind, _query: string): Promise<SkillMemoryRead[]> {
		if (SECRET_MEMORY_KIND.test(kind)) return [];
		return [];
	}

	getPreferences(userId: string) {
		return this.preferences.getPreferences(userId);
	}
}

export class DefaultSkillMemoryPolicy implements MemoryPolicy {
	canRead(kind: SkillMemoryKind, _context: SkillExecutionContext): boolean {
		return !SECRET_MEMORY_KIND.test(kind);
	}

	async evaluateWrite(
		write: SkillMemoryWrite,
		_context: SkillExecutionContext
	): Promise<SkillMemoryWriteDecision> {
		if (write.sensitive || SECRET_MEMORY_KIND.test(write.kind)) {
			return { allowed: false, reason: 'Memory policy rejects sensitive skill writes.' };
		}
		return { allowed: true, reason: 'Memory write approved by policy.', committed: false };
	}
}
