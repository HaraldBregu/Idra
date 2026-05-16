import type { AssistantMessage, AssistantRunState } from '../context';

const runStateLabels: Record<AssistantRunState, string> = {
	idle: 'Ready',
	thinking: 'Thinking',
	reasoning: 'Thinking',
	using_tools: 'Using tools',
	waiting_for_approval: 'Needs approval',
	answering: 'Answering',
	completed: 'Completed',
	cancelled: 'Cancelled',
	error: 'Error',
};

export function isRunningState(state: AssistantRunState): boolean {
	return (
		state === 'thinking' ||
		state === 'reasoning' ||
		state === 'using_tools' ||
		state === 'waiting_for_approval' ||
		state === 'answering'
	);
}

export function stateTone(state: AssistantRunState): string {
	if (state === 'error') return 'bg-destructive/10 text-destructive';
	if (state === 'cancelled') return 'bg-muted text-muted-foreground';
	if (state === 'completed') return 'bg-success/10 text-success';
	if (state === 'waiting_for_approval') return 'bg-warning/10 text-warning';
	return 'bg-info/10 text-info';
}

export function assistantStatusLabel(message: AssistantMessage): string {
	if (message.state === 'answering' && message.tools.length === 0) {
		return 'Responding directly';
	}
	if (message.state === 'answering' && message.tools.length > 0) {
		return 'Answering with tool results';
	}
	if (message.state === 'completed' && message.tools.length === 0) {
		return 'Responded directly';
	}
	if (message.state === 'completed' && message.tools.length > 0) {
		return `Completed with ${message.tools.length} tool call${
			message.tools.length === 1 ? '' : 's'
		}`;
	}
	return runStateLabels[message.state];
}
