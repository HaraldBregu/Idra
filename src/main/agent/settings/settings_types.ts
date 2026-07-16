import type { GoalBudget } from '../run/run_goal_types';

export type SettingsSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
	goal: GoalBudget;
};

export const DEFAULT_GOAL_SETTINGS: GoalBudget = {
	maxIterations: 5,
	maxToolCalls: 30,
	timeoutMs: 10 * 60 * 1000,
};

export const DEFAULT_AGENT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
	goal: DEFAULT_GOAL_SETTINGS,
};
