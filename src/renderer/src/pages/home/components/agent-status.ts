import type { AgentMessage, AgentRunState } from '../context';

const runStateLabels: Record<AgentRunState, string> = {
	idle: 'Ready',
	thinking: 'Thinking',
	reasoning: 'Reasoning',
	using_tools: 'Using tools',
	answering: 'Answering',
	completed: 'Completed',
	cancelled: 'Cancelled',
	error: 'Error',
};

export function isRunningState(state: AgentRunState): boolean {
	return (
		state === 'thinking' ||
		state === 'reasoning' ||
		state === 'using_tools' ||
		state === 'answering'
	);
}

export function stateTone(state: AgentRunState): string {
	if (state === 'error') return 'bg-destructive/10 text-destructive';
	if (state === 'cancelled') return 'bg-muted text-muted-foreground';
	if (state === 'completed') return 'bg-success/10 text-success';
	return 'bg-info/10 text-info';
}

function reasoningEffort(message: AgentMessage): string | undefined {
	return message.model?.effort ?? message.requestedEffort;
}

function usesReasoning(message: AgentMessage): boolean {
	const effort = reasoningEffort(message);
	if (effort === 'none') return false;
	return Boolean(effort) || (message.reasoning?.length ?? 0) > 0;
}

function formatElapsedSeconds(message: AgentMessage): string | undefined {
	if (message.startedAtMs === undefined || message.completedAtMs === undefined) {
		return undefined;
	}

	const seconds = Math.max(1, Math.ceil((message.completedAtMs - message.startedAtMs) / 1000));
	return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

export function agentStatusLabel(message: AgentMessage): string {
	if (message.state === 'thinking' && reasoningEffort(message) === 'none') {
		return 'Preparing answer';
	}

	if (message.state === 'answering' && message.tools.length > 0) {
		return 'Answering with tool results';
	}

	if (message.state === 'completed') {
		const elapsed = formatElapsedSeconds(message);
		if (message.tools.length > 0) {
			return elapsed ? `Finished in ${elapsed}` : 'Finished';
		}
		if (!usesReasoning(message)) {
			return elapsed ? `Answered in ${elapsed}` : 'Answered';
		}
		return elapsed ? `Reasoned for ${elapsed}` : 'Reasoned for a moment';
	}

	return runStateLabels[message.state];
}
