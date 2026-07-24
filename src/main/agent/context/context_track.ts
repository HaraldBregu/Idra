import type { RuntimeEvent } from '../types';
import type { AgentContextState } from './context_state_types';

export function trackEvent(state: AgentContextState, event: RuntimeEvent): void {
	if (event.type === 'run_started') {
		state.conversation.sessionId = event.sessionId;
		state.execution = { phase: 'thinking', model: event.model };
		return;
	}
	if (event.type === 'model_call_start') {
		state.execution = { phase: 'thinking', model: event.model };
		state.systemPrompt = state.custom.systemPrompt;
		return;
	}
	if (event.type === 'model_call_delta') {
		state.execution.phase = 'streaming';
		return;
	}
	if (event.type === 'assistant_message') {
		state.conversation.messageCount += 1;
		if (state.task) {
			state.task.turns += 1;
			state.task.toolCalls += event.toolCalls.length;
		}
		return;
	}
	if (event.type === 'tool_call_start') {
		state.execution = { ...state.execution, phase: 'tool', toolName: event.toolName };
		return;
	}
	if (event.type === 'tool_call_end') {
		state.execution = { ...state.execution, phase: 'thinking', toolName: undefined };
	}
}
