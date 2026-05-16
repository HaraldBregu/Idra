import type { AgentTool } from '../common';
import { markCoreTool, ToolInputError } from '../common';
import { asParamsRecord, readStringParam } from '../params';

export type PlanStatus = 'pending' | 'in_progress' | 'completed';

export type PlanEntry = {
	step: string;
	status: PlanStatus;
};

export type UpdatePlanToolOptions = {
	onUpdatePlan?: (plan: PlanEntry[], explanation?: string) => void | Promise<void>;
};

const PLAN_STATUSES: PlanStatus[] = ['pending', 'in_progress', 'completed'];

function readPlan(value: unknown): PlanEntry[] {
	if (!Array.isArray(value)) throw new ToolInputError('Parameter plan must be an array.', { key: 'plan' });
	return value.map((entry, index) => {
		const record = asParamsRecord(entry);
		const step = readStringParam(record, 'step', { required: true, minLength: 1 })!;
		const status = readStringParam(record, 'status', { required: true }) as PlanStatus;
		if (!PLAN_STATUSES.includes(status)) {
			throw new ToolInputError('Plan status must be pending, in_progress, or completed.', {
				index,
				status,
			});
		}
		return { step, status };
	});
}

export function createUpdatePlanTool(
	options: UpdatePlanToolOptions = {}
): AgentTool<Record<string, unknown>, { status: 'updated'; plan: PlanEntry[]; explanation?: string }> {
	return markCoreTool({
		name: 'update_plan',
		label: 'Update Plan',
		description: 'Update the current task plan with pending, in_progress, or completed steps.',
		parameters: {
			type: 'object',
			properties: {
				explanation: { type: 'string' },
				plan: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							step: { type: 'string' },
							status: { type: 'string', enum: PLAN_STATUSES },
						},
						required: ['step', 'status'],
						additionalProperties: false,
					},
				},
			},
			required: ['plan'],
			additionalProperties: false,
		},
		async execute(_toolCallId, params) {
			const record = asParamsRecord(params);
			const plan = readPlan(record.plan);
			const explanation = readStringParam(record, 'explanation');
			await options.onUpdatePlan?.(plan, explanation);
			return {
				content: [],
				details: { status: 'updated', plan, explanation },
			};
		},
	});
}

