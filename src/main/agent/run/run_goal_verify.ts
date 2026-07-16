import type {
	CriterionCheck,
	CriterionResult,
	Goal,
	GoalCriterion,
	GoalJudge,
	GoalVerdict,
} from './run_goal_types';

export async function verifyGoal(
	goal: Goal,
	evidence: string,
	judge?: GoalJudge,
): Promise<GoalVerdict> {
	const criteria: CriterionResult[] = [];
	for (const criterion of goal.successCriteria) {
		criteria.push({
			id: criterion.id,
			description: criterion.description,
			...(await checkCriterion(criterion, evidence, judge)),
		});
	}
	// A goal without criteria can never be verified, so it never passes.
	return { passed: criteria.length > 0 && criteria.every((result) => result.passed), criteria };
}

async function checkCriterion(
	criterion: GoalCriterion,
	evidence: string,
	judge?: GoalJudge,
): Promise<CriterionCheck> {
	try {
		if (criterion.verification.type === 'programmatic') return await criterion.verification.check();
		if (!judge) throw new Error(`criterion '${criterion.id}' uses llm_judge but no judge is configured`);
		return await judge(criterion.verification.rubric, evidence);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { passed: false, evidence: `Error: verification failed: ${message}` };
	}
}
