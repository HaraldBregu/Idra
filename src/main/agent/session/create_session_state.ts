import { createRunContext } from '../state';
import { DEFAULT_CATEGORY, type SessionState } from './types';

export function createSessionState(): SessionState {
	return {
		id: '',
		category: DEFAULT_CATEGORY,
		messages: [],
		toolCalls: [],
		usage: { inputTokens: 0, outputTokens: 0 },
		maxTurns: 20,
		model: 'default',
		numTurns: 0,
		finalText: '',
		sessionsPath: '',
		folderName: '',
		runTraceBuffer: [],
		runContext: createRunContext(),
	};
}
