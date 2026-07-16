import type { GoalIterationLog } from './goal_types';

export function detectStuck(
	transcript: GoalIterationLog[],
	stuckAfter: number,
): string | undefined {
	if (stuckAfter < 2 || transcript.length < stuckAfter) return undefined;
	const fingerprints = transcript.slice(-stuckAfter).map(fingerprint);
	if (fingerprints.some((entry) => entry !== fingerprints[0])) return undefined;
	return (
		`No progress in the last ${stuckAfter} iterations: ` +
		'the agent repeated the same actions and the same criteria kept failing.'
	);
}

function fingerprint(log: GoalIterationLog): string {
	return JSON.stringify({
		actions: log.actions.map((action) => ({
			name: action.toolName,
			input: action.input,
			isError: action.isError,
		})),
		failures: (log.verification?.criteria ?? [])
			.filter((criterion) => !criterion.passed)
			.map((criterion) => ({ id: criterion.id, evidence: criterion.evidence })),
	});
}
