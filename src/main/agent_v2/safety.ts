import { computationalGuide, computationalSensor, inferentialSensor } from './controls';
import type { SafetyLayer } from './types';

export const safetyStack: SafetyLayer[] = [
	{
		order: 1,
		name: 'Prompt Guardrails',
		summary: 'Shape allowed behavior before the model reasons or acts.',
		control: computationalGuide,
	},
	{
		order: 2,
		name: 'Schema Restrictions',
		summary: 'Constrain tool arguments and model outputs to typed structures.',
		control: computationalGuide,
	},
	{
		order: 3,
		name: 'Runtime Approval',
		summary: 'Apply deny, ask, and allow decisions before side effects happen.',
		control: computationalSensor,
	},
	{
		order: 4,
		name: 'Tool Validation',
		summary: 'Validate paths, arguments, ownership, and service boundaries inside handlers.',
		control: computationalSensor,
	},
	{
		order: 5,
		name: 'Lifecycle Hooks',
		summary: 'Run pre-tool and post-run checks that can block or modify execution.',
		control: computationalSensor,
	},
	{
		order: 6,
		name: 'Sandbox',
		summary: 'Use process-level isolation as the final backstop for file and network access.',
		control: computationalGuide,
	},
	{
		order: 7,
		name: 'Inferential Review',
		summary: 'Use review agents or judges when deterministic checks cannot assess semantics.',
		control: inferentialSensor,
	},
];
