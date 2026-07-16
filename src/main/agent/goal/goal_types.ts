import type { Provider, Tool } from '../types';
import type { LlmRequest, LlmResponse } from '../../models/llm';

export interface GoalBudget {
	maxIterations: number;
	maxToolCalls: number;
	maxTokens?: number;
	timeoutMs?: number;
}

export interface CriterionCheck {
	passed: boolean;
	evidence: string;
}

export type GoalVerification =
	| { type: 'programmatic'; check: () => Promise<CriterionCheck> | CriterionCheck }
	| { type: 'llm_judge'; rubric: string };

export interface GoalCriterion {
	id: string;
	description: string;
	verification: GoalVerification;
}

export interface GoalConstraint {
	description: string;
	violatedBy?: (toolName: string, input: Record<string, unknown>) => boolean;
}

export interface Goal {
	description: string;
	successCriteria: GoalCriterion[];
	constraints: GoalConstraint[];
	budget: GoalBudget;
}

export interface CriterionResult extends CriterionCheck {
	id: string;
	description: string;
}

export interface GoalVerdict {
	passed: boolean;
	criteria: CriterionResult[];
}

export type GoalJudge = (rubric: string, evidence: string) => Promise<CriterionCheck>;

export interface GoalAction {
	toolCallId: string;
	toolName: string;
	input: Record<string, unknown>;
	output: string;
	isError: boolean;
}

export interface GoalIterationLog {
	iteration: number;
	plan: string;
	actions: GoalAction[];
	observations: string[];
	verification?: GoalVerdict;
}

export type GoalRunResult =
	| { status: 'achieved'; evidence: CriterionResult[]; transcript: GoalIterationLog[] }
	| { status: 'budget_exceeded'; partialProgress?: GoalVerdict; transcript: GoalIterationLog[] }
	| { status: 'stuck'; reason: string; transcript: GoalIterationLog[] }
	| { status: 'aborted'; reason: string; transcript: GoalIterationLog[] };

export type GoalCheckpointDecision = 'continue' | 'abort';

export interface GoalCheckpointContext {
	reason: 'interval' | 'irreversible_action';
	iteration: number;
	toolName?: string;
	input?: Record<string, unknown>;
	lastVerification?: GoalVerdict;
}

export interface GoalCheckpoint {
	everyIterations?: number;
	irreversibleTools?: string[];
	confirm: (
		context: GoalCheckpointContext,
	) => Promise<GoalCheckpointDecision> | GoalCheckpointDecision;
}

export interface GoalModel {
	generate(request: LlmRequest): Promise<LlmResponse>;
}

export interface GoalRunOptions {
	goal: Goal;
	tools: Tool[];
	provider: Provider;
	model: string;
	llm?: GoalModel;
	judge?: GoalJudge;
	checkpoint?: GoalCheckpoint;
	stuckAfter?: number;
	maxTokensPerCall?: number;
	signal?: AbortSignal;
	onIteration?: (log: GoalIterationLog) => void;
}
