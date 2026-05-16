import type {
	AgentHistoryMessage,
	AgentPendingApproval,
	AgentPendingEventPayload,
	AgentPendingInput,
	AgentResponseEvent,
	AgentToolCallStatus,
} from '../../../../../shared/service';
import type { AgentChatAction } from './actions';
import {
	applyAgentResponseEventToTools,
	type AgentToolPart,
	agentToolPartFromHistoryBlock,
	updateAgentToolPart,
} from './tool-parts';
import {
	initialAgentChatState,
	welcomeMessage,
	type AgentChatState,
	type AgentMessage,
	type HomeChatMessage,
	type HomeMultiSelectMessage,
	type HomeMultiSelectOption,
	type UserMessage,
} from './state';

function removePendingMessages(messages: readonly HomeChatMessage[]): HomeChatMessage[] {
	return messages.filter((message) => message.type !== 'multi-select');
}

function isAgentMessage(message: HomeChatMessage): message is AgentMessage {
	return message.role === 'agent' && message.type === 'agent';
}

function createUserMessage(id: string, content: string): UserMessage {
	return {
		id,
		role: 'user',
		type: 'user',
		content,
	};
}

function createAgentMessage(
	id: string,
	runId?: string,
	startedAtMs?: number
): AgentMessage {
	return {
		id,
		role: 'agent',
		type: 'agent',
		content: '',
		runId,
		state: 'thinking',
		tools: [],
		startedAtMs,
	};
}

function updateAgentMessage(
	state: AgentChatState,
	messageId: string,
	update: (message: AgentMessage) => AgentMessage
): AgentChatState {
	return {
		...state,
		messages: state.messages.map((message) =>
			message.id === messageId && isAgentMessage(message) ? update(message) : message
		),
	};
}

function activeAgent(state: AgentChatState): AgentMessage | undefined {
	return state.messages.find(
		(message) => message.id === state.activeAgentId && isAgentMessage(message)
	) as AgentMessage | undefined;
}

function ensureAgentForRun(
	state: AgentChatState,
	runId: string
): { state: AgentChatState; message: AgentMessage } {
	const current = activeAgent(state);
	if (current) {
		if (current.runId && current.runId !== runId) return { state, message: current };
		const nextMessage = current.runId ? current : { ...current, runId };
		if (nextMessage === current) return { state, message: current };
		const nextState = updateAgentMessage(state, current.id, () => nextMessage);
		return { state: { ...nextState, activeRunId: runId }, message: nextMessage };
	}

	const existing = state.messages.find(
		(message) => isAgentMessage(message) && message.runId === runId
	) as AgentMessage | undefined;
	if (existing) {
		return {
			state: { ...state, activeAgentId: existing.id, activeRunId: runId },
			message: existing,
		};
	}

	const message = createAgentMessage(`agent-${runId}`, runId);
	return {
		state: {
			...state,
			messages: [...removePendingMessages(state.messages), message],
			activeAgentId: message.id,
			activeRunId: runId,
		},
		message,
	};
}

function isTerminalRunState(state: AgentMessage['state']): boolean {
	return state === 'completed' || state === 'cancelled' || state === 'error';
}

function applyResponseEvent(
	state: AgentChatState,
	event: AgentResponseEvent,
	receivedAtMs: number
): AgentChatState {
	if (state.activeRunId && state.activeRunId !== event.runId) return state;
	const ensured = ensureAgentForRun(state, event.runId);
	if (ensured.message.runId && ensured.message.runId !== event.runId) return state;

	if (event.type === 'run_state') {
		return updateAgentMessage(ensured.state, ensured.message.id, (message) => ({
			...message,
			runId: event.runId,
			state: event.state,
			errorText: event.state === 'error' ? (event.label ?? message.errorText) : message.errorText,
			startedAtMs: message.startedAtMs ?? receivedAtMs,
			completedAtMs: isTerminalRunState(event.state) ? receivedAtMs : message.completedAtMs,
		}));
	}

	if (event.type === 'reasoning_summary') {
		return ensured.state;
	}

	if (event.type === 'text_delta') {
		if (!event.delta) return ensured.state;
		return updateAgentMessage(
			{ ...ensured.state, activeAgentId: ensured.message.id, activeRunId: event.runId },
			ensured.message.id,
			(message) => ({
				...message,
				runId: event.runId,
				state: 'answering',
				content: message.content + event.delta,
				startedAtMs: message.startedAtMs ?? receivedAtMs,
			})
		);
	}

	const tools = applyAgentResponseEventToTools(ensured.message.tools, event);
	if (!tools) return ensured.state;

	return updateAgentMessage(
		{ ...ensured.state, activeAgentId: ensured.message.id, activeRunId: event.runId },
		ensured.message.id,
		(message) => ({
			...message,
			runId: event.runId,
			state: 'using_tools',
			tools,
			startedAtMs: message.startedAtMs ?? receivedAtMs,
		})
	);
}

function addToolResultToMessages(
	messages: readonly HomeChatMessage[],
	toolUseId: string | undefined,
	content: string | null | undefined,
	isError: boolean | undefined,
	status: AgentToolCallStatus | undefined,
	output: unknown
): HomeChatMessage[] {
	if (!toolUseId) return [...messages];
	const resolvedStatus: AgentToolCallStatus = status ?? (isError ? 'error' : 'ok');
	const hasError = resolvedStatus !== 'ok';
	const errorText =
		hasError && content
			? content
			: hasError
				? resolvedStatus === 'rejected'
					? 'Tool call was rejected.'
					: 'Tool call failed.'
				: undefined;

	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (!isAgentMessage(message)) continue;
		if (!message.tools.some((tool) => tool.toolCallId === toolUseId)) continue;

		const nextMessage: AgentMessage = {
			...message,
			tools: updateAgentToolPart(message.tools, toolUseId, {
				state: hasError ? 'output-error' : 'output-available',
				output: output ?? content ?? '',
				outputText: content ?? '',
				errorText,
				status: resolvedStatus,
			}),
		};

		return messages.map((current, currentIndex) =>
			currentIndex === index ? nextMessage : current
		);
	}

	return [...messages];
}

export function historyToChatMessages(history: AgentHistoryMessage[]): HomeChatMessage[] {
	const out: HomeChatMessage[] = [];
	history.forEach((message, index) => {
		if (message.role === 'tool') {
			const next = addToolResultToMessages(
				out,
				message.toolUseId,
				message.content,
				message.isError,
				message.status,
				message.output
			);
			out.splice(0, out.length, ...next);
			return;
		}

		if (message.role === 'user') {
			const content = typeof message.content === 'string' ? message.content : '';
			if (content.length > 0) out.push(createUserMessage(`user-history-${index}`, content));
			return;
		}

		if (message.role !== 'assistant') return;
		const content = typeof message.content === 'string' ? message.content : '';
		const tools = (message.contentBlocks ?? [])
			.map(agentToolPartFromHistoryBlock)
			.filter((tool): tool is AgentToolPart => Boolean(tool));

		if (content.length === 0 && tools.length === 0) return;
		out.push({
			id: `agent-history-${index}`,
			role: 'agent',
			type: 'agent',
			content,
			state: 'completed',
			tools,
		});
	});
	return out;
}

export function pendingToMultiSelectMessage(
	event: AgentPendingEventPayload,
	createdAtMs: number
): HomeMultiSelectMessage | null {
	const { approvals, inputs } = event;
	if (approvals.length === 0 && inputs.length === 0) return null;

	const options: HomeMultiSelectOption[] = [
		...approvals.map((approval: AgentPendingApproval) => ({
			id: `approval:${approval.id}:allow-once`,
			kind: 'approval' as const,
			label: `${approval.toolName}: Allow once`,
			description: approval.command ?? JSON.stringify(approval.argsPreview ?? {}),
			approvalId: approval.id,
			decision: 'allow-once' as const,
		})),
		...approvals
			.filter((approval) => approval.allowedDecisions.includes('allow-always'))
			.map((approval) => ({
				id: `approval:${approval.id}:allow-always`,
				kind: 'approval' as const,
				label: `${approval.toolName}: Allow always`,
				description: approval.command ?? JSON.stringify(approval.argsPreview ?? {}),
				approvalId: approval.id,
				decision: 'allow-always' as const,
			})),
		...approvals.map((approval) => ({
			id: `approval:${approval.id}:deny`,
			kind: 'approval' as const,
			label: `${approval.toolName}: Deny`,
			description: approval.command ?? JSON.stringify(approval.argsPreview ?? {}),
			approvalId: approval.id,
			decision: 'deny' as const,
		})),
		...inputs.map((input: AgentPendingInput) => ({
			id: `input:${input.id}`,
			kind: 'input' as const,
			label: 'Required input',
			description:
				input.question +
				(input.suggestions ? `\nSuggestions: ${input.suggestions.join(' | ')}` : ''),
			inputId: input.id,
		})),
	];

	return {
		id: `agent-pending-${createdAtMs}`,
		role: 'agent',
		type: 'multi-select',
		prompt: 'The agent needs you to confirm or answer the following:',
		options,
	};
}

export function defaultPendingSelections(message: HomeMultiSelectMessage): string[] {
	const selections: string[] = [];
	const seenApprovals = new Set<string>();

	for (const option of message.options) {
		if (
			option.kind === 'approval' &&
			option.approvalId &&
			option.decision === 'deny' &&
			!seenApprovals.has(option.approvalId)
		) {
			selections.push(option.id);
			seenApprovals.add(option.approvalId);
		}
	}

	return selections;
}

export function agentChatReducer(
	state: AgentChatState,
	action: AgentChatAction
): AgentChatState {
	switch (action.type) {
		case 'submit_user_message': {
			const userMessage = createUserMessage(action.userMessageId, action.content);
			const agentMessage = createAgentMessage(
				action.agentMessageId,
				undefined,
				action.submittedAtMs
			);
			return {
				messages: [...removePendingMessages(state.messages), userMessage, agentMessage],
				activeAgentId: agentMessage.id,
			};
		}
		case 'append_user_message':
			return {
				...state,
				messages: [
					...removePendingMessages(state.messages),
					createUserMessage(action.messageId, action.content),
				],
			};
		case 'apply_response_event':
			return applyResponseEvent(state, action.event, action.receivedAtMs);
		case 'set_pending_message': {
			const messages = removePendingMessages(state.messages);
			const withPending = action.message ? [...messages, action.message] : messages;
			if (!action.message) return { ...state, messages: withPending };
			const current = activeAgent(state);
			if (!current) return { ...state, messages: withPending };
			return updateAgentMessage(
				{ ...state, messages: withPending },
				current.id,
				(message) => ({ ...message, state: 'waiting_for_approval' })
			);
		}
		case 'complete_active': {
			const current = activeAgent(state);
			if (!current) {
				if (action.response.trim().length === 0) return state;
				const message: AgentMessage = {
					...createAgentMessage(
						`agent-completed-${Date.now()}`,
						undefined,
						action.completedAtMs
					),
					content: action.response,
					state: 'completed',
					completedAtMs: action.completedAtMs,
				};
				return { ...state, messages: [...removePendingMessages(state.messages), message] };
			}

			const nextState = updateAgentMessage(state, current.id, (message) => ({
				...message,
				content: action.response.trim().length > 0 ? action.response : message.content,
				state:
					message.state === 'error' || message.state === 'cancelled'
						? message.state
						: 'completed',
				startedAtMs: message.startedAtMs ?? action.completedAtMs,
				completedAtMs: action.completedAtMs ?? message.completedAtMs,
			}));
			return { ...nextState, activeAgentId: undefined, activeRunId: undefined };
		}
		case 'cancel_active': {
			const current = activeAgent(state);
			if (!current) return state;
			const nextState = updateAgentMessage(state, current.id, (message) => ({
				...message,
				state: 'cancelled',
				errorText: 'Cancelled.',
				startedAtMs: message.startedAtMs ?? action.completedAtMs,
				completedAtMs: action.completedAtMs ?? message.completedAtMs,
			}));
			return { ...nextState, activeAgentId: undefined, activeRunId: undefined };
		}
		case 'error_active': {
			const current = activeAgent(state);
			if (!current) {
				const message: AgentMessage = {
					...createAgentMessage(
						`agent-error-${Date.now()}`,
						undefined,
						action.completedAtMs
					),
					content: action.errorText,
					state: 'error',
					errorText: action.errorText,
					completedAtMs: action.completedAtMs,
				};
				return { ...state, messages: [...removePendingMessages(state.messages), message] };
			}

			const nextState = updateAgentMessage(state, current.id, (message) => ({
				...message,
				content: message.content || action.errorText,
				state: 'error',
				errorText: action.errorText,
				startedAtMs: message.startedAtMs ?? action.completedAtMs,
				completedAtMs: action.completedAtMs ?? message.completedAtMs,
			}));
			return { ...nextState, activeAgentId: undefined, activeRunId: undefined };
		}
		case 'restore_history': {
			const restored = historyToChatMessages(action.history);
			return {
				messages: restored.length > 0 ? [welcomeMessage, ...restored] : [welcomeMessage],
				activeAgentId: undefined,
				activeRunId: undefined,
			};
		}
		case 'reset':
			return initialAgentChatState;
	}
}
