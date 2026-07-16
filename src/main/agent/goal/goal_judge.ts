import type { Provider } from '../types';
import type { CriterionCheck, GoalJudge, GoalModel } from './goal_types';

const judgeSystemPrompt =
	'You are a strict verifier. You receive a rubric and evidence collected from real tool outputs. ' +
	'Judge only whether the evidence satisfies the rubric; claims without evidence do not count. ' +
	'Respond with a single JSON object: {"passed": boolean, "reasoning": string}. No other text.';

// The judge is a fresh conversation: it sees only the rubric and the evidence,
// never the actor's chat history.
export function createJudge(llm: GoalModel, provider: Provider, model: string): GoalJudge {
	return async (rubric, evidence): Promise<CriterionCheck> => {
		const response = await llm.generate({
			provider,
			model,
			systemPrompt: judgeSystemPrompt,
			messages: [{ role: 'user', content: `Rubric:\n${rubric}\n\nEvidence:\n${evidence}` }],
			maxTokens: 1024,
		});

		const match = response.content.match(/\{[\s\S]*\}/);
		if (!match) {
			return { passed: false, evidence: `Judge returned no verdict: ${response.content}` };
		}
		try {
			const verdict = JSON.parse(match[0]) as { passed?: unknown; reasoning?: unknown };
			return {
				passed: verdict.passed === true,
				evidence: typeof verdict.reasoning === 'string' ? verdict.reasoning : match[0],
			};
		} catch {
			return { passed: false, evidence: `Judge returned invalid JSON: ${response.content}` };
		}
	};
}
