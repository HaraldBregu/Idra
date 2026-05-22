import type { SkillDiscoveryResult, SkillSelectionDecision } from '../core/types';

const UNSAFE_INTENT = /\b(steal|exfiltrate|bypass|malware|credential theft|phishing)\b/i;

export class SkillSelector {
	select(discovery: SkillDiscoveryResult): SkillSelectionDecision {
		if (UNSAFE_INTENT.test(discovery.query)) {
			return { kind: 'refuseSafely', reason: 'The request appears unsafe for skill execution.' };
		}

		if (discovery.candidates.length === 0) {
			return { kind: 'answerDirectly', reason: 'No relevant authorized skill was found.' };
		}

		const [top, second] = discovery.candidates;
		if (top && second && Math.abs(top.ranking.score - second.ranking.score) < 0.03) {
			return {
				kind: 'askClarifyingQuestion',
				question: `Should I use ${top.skill.name} or ${second.skill.name}?`,
				candidates: [top, second],
			};
		}

		const multiStepIntent = /\b(and then|then|after that|workflow|compose|draft|email|report)\b/i.test(
			discovery.query
		);
		if (multiStepIntent && discovery.candidates.length > 1) {
			return {
				kind: 'useMultipleSkills',
				skills: discovery.candidates.slice(0, 3),
				reason: 'The request appears to need multiple reusable capabilities.',
			};
		}

		return { kind: 'useSkill', skill: top, reason: 'Top ranked skill is sufficiently specific.' };
	}
}
