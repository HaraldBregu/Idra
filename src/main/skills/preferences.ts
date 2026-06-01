import type { SkillResult, SkillUserPreferences } from './types';
import { emptyPreferences } from './types';

export interface SkillPreferenceStore {
	getPreferences(userId: string): Promise<SkillUserPreferences>;
	recordOutcome(userId: string, skillId: string, result: SkillResult): Promise<void>;
	rememberPreference(userId: string, preference: Partial<SkillUserPreferences>): Promise<void>;
	getSuccessRate(userId: string, skillId: string): Promise<number | undefined>;
}

interface StoredPreferences extends SkillUserPreferences {
	successes: Record<string, number>;
	failures: Record<string, number>;
}

function mergeUnique(left: string[], right?: string[]): string[] {
	return Array.from(new Set([...left, ...(right ?? [])]));
}

export class InMemorySkillPreferenceStore implements SkillPreferenceStore {
	private readonly byUser = new Map<string, StoredPreferences>();

	async getPreferences(userId: string): Promise<SkillUserPreferences> {
		const stored = this.ensure(userId);
		return {
			preferredSkills: [...stored.preferredSkills],
			avoidedSkills: [...stored.avoidedSkills],
			preferredWorkflowStyles: [...stored.preferredWorkflowStyles],
			preferredOutputFormats: [...stored.preferredOutputFormats],
			preferredAutomationLevel: stored.preferredAutomationLevel,
			metadata: { ...stored.metadata },
		};
	}

	async recordOutcome(userId: string, skillId: string, result: SkillResult): Promise<void> {
		const stored = this.ensure(userId);
		const key = skillId.toLowerCase();
		if (result.success) {
			stored.successes[key] = (stored.successes[key] ?? 0) + 1;
		} else {
			stored.failures[key] = (stored.failures[key] ?? 0) + 1;
		}
	}

	async rememberPreference(userId: string, preference: Partial<SkillUserPreferences>): Promise<void> {
		const stored = this.ensure(userId);
		stored.preferredSkills = mergeUnique(stored.preferredSkills, preference.preferredSkills);
		stored.avoidedSkills = mergeUnique(stored.avoidedSkills, preference.avoidedSkills);
		stored.preferredWorkflowStyles = mergeUnique(
			stored.preferredWorkflowStyles,
			preference.preferredWorkflowStyles
		);
		stored.preferredOutputFormats = mergeUnique(
			stored.preferredOutputFormats,
			preference.preferredOutputFormats
		);
		stored.preferredAutomationLevel =
			preference.preferredAutomationLevel ?? stored.preferredAutomationLevel;
		stored.metadata = { ...stored.metadata, ...(preference.metadata ?? {}) };
	}

	async getSuccessRate(userId: string, skillId: string): Promise<number | undefined> {
		const stored = this.ensure(userId);
		const key = skillId.toLowerCase();
		const successes = stored.successes[key] ?? 0;
		const failures = stored.failures[key] ?? 0;
		const total = successes + failures;
		return total === 0 ? undefined : successes / total;
	}

	private ensure(userId: string): StoredPreferences {
		const existing = this.byUser.get(userId);
		if (existing) return existing;
		const next: StoredPreferences = {
			...emptyPreferences(),
			successes: {},
			failures: {},
		};
		this.byUser.set(userId, next);
		return next;
	}
}
