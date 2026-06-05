import {
	computationalGuide,
	computationalSensor,
	inferentialGuide,
	inferentialSensor,
} from './controls';
import type { LoopPhase } from './types';

export const loopPhases: LoopPhase[] = [
	{
		order: 0,
		id: 'precheck',
		name: 'Pre-check And Compaction',
		summary: 'Drain queued messages, check budgets, compact context, and reject impossible starts.',
		primaryControl: computationalSensor,
	},
	{
		order: 1,
		id: 'thinking',
		name: 'Thinking',
		summary: 'Optionally run a no-tool reasoning pass before action selection.',
		primaryControl: inferentialGuide,
	},
	{
		order: 2,
		id: 'critique',
		name: 'Self-critique',
		summary: 'Optionally evaluate the current plan or draft before tool access.',
		primaryControl: inferentialSensor,
	},
	{
		order: 3,
		id: 'action',
		name: 'Action',
		summary: 'Call the action model with tool schemas and receive text or tool calls.',
		primaryControl: inferentialGuide,
	},
	{
		order: 4,
		id: 'tools',
		name: 'Tool Execution',
		summary: 'Dispatch approved tool calls through typed handlers and collect observations.',
		primaryControl: computationalGuide,
	},
	{
		order: 5,
		id: 'postprocess',
		name: 'Post-processing',
		summary: 'Persist state, emit events, detect repetitive loops, and decide whether to iterate.',
		primaryControl: computationalSensor,
	},
];
