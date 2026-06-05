import type { ControlLabel } from './types';

export const computationalGuide: ControlLabel = {
	direction: 'guide',
	mechanism: 'computational',
	examples: ['schema restrictions', 'tool allowlists', 'static routing rules'],
};

export const inferentialGuide: ControlLabel = {
	direction: 'guide',
	mechanism: 'inferential',
	examples: ['system prompts', 'skills', 'retrieved guidance'],
};

export const computationalSensor: ControlLabel = {
	direction: 'sensor',
	mechanism: 'computational',
	examples: ['output parsers', 'type checks', 'unit tests'],
};

export const inferentialSensor: ControlLabel = {
	direction: 'sensor',
	mechanism: 'inferential',
	examples: ['self-critique', 'review agents', 'LLM-as-judge'],
};

export const controlMatrix = [
	computationalGuide,
	inferentialGuide,
	computationalSensor,
	inferentialSensor,
] as const;
