import type { SkillDefinition } from '../core/types';

function parts(version: string): number[] {
	return version
		.split(/[+-]/)[0]
		.split('.')
		.map((part) => Number.parseInt(part, 10))
		.map((part) => (Number.isFinite(part) ? part : 0));
}

export function compareSkillVersions(a: string, b: string): number {
	const left = parts(a);
	const right = parts(b);
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index++) {
		const diff = (left[index] ?? 0) - (right[index] ?? 0);
		if (diff !== 0) return diff;
	}
	return a.localeCompare(b);
}

export class SkillVersionManager {
	latest<TSkill extends Pick<SkillDefinition, 'version'>>(skills: TSkill[]): TSkill | undefined {
		return [...skills].sort((a, b) => compareSkillVersions(b.version, a.version))[0];
	}

	satisfies(version: string, range?: string): boolean {
		const trimmed = range?.trim();
		if (!trimmed || trimmed === '*') return true;
		if (trimmed === version) return true;

		if (trimmed.startsWith('>=')) {
			return compareSkillVersions(version, trimmed.slice(2).trim()) >= 0;
		}

		if (trimmed.startsWith('^')) {
			const base = trimmed.slice(1).trim();
			const [major] = parts(base);
			return parts(version)[0] === major && compareSkillVersions(version, base) >= 0;
		}

		if (trimmed.startsWith('~')) {
			const base = trimmed.slice(1).trim();
			const [major, minor] = parts(base);
			const [actualMajor, actualMinor] = parts(version);
			return actualMajor === major && actualMinor === minor && compareSkillVersions(version, base) >= 0;
		}

		if (trimmed.endsWith('.x') || trimmed.endsWith('.*')) {
			const wanted = trimmed.slice(0, -2).split('.');
			const actual = version.split('.');
			return wanted.every((part, index) => actual[index] === part);
		}

		return false;
	}

	compatible<TSkill extends Pick<SkillDefinition, 'version'>>(
		skills: TSkill[],
		range?: string
	): TSkill | undefined {
		return this.latest(skills.filter((skill) => this.satisfies(skill.version, range)));
	}
}
