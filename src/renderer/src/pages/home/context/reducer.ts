import type {
	AssistantHistoryMessage,
	AssistantPendingApproval,
	AssistantPendingEventPayload,
	AssistantPendingInput,
	AssistantResponseEvent,
	AssistantToolCallStatus,
} from '../../../../../shared/service';
import type { AssistantChatAction } from './actions';
import {
	applyAssistantResponseEventToTools,
	type AssistantToolPart,
	assistantToolPartFromHistoryBlock,
	updateAssistantToolPart,
} from './tool-parts';
import {
	initialAssistantChatState,
	welcomeMessage,
	type AssistantChatState,
	type AssistantMessage,
	type HomeChatMessage,
	type HomeMultiSelectMessage,
	type HomeMultiSelectOption,
	type UserMessage,
} from './state';

function removePendingMessages(messages: readonly HomeChatMessage[]): HomeChatMessage[] {
	return messages.filter((message) => message.type !== 'multi-select');
}

function isAssistantMessage(message: HomeChatMessage): message is AssistantMessage {
	return message.role === 'assistant' && message.type === 'assistant';
}

function createUserMessage(id: string, content: string): UserMessage {
	return {
		id,
		role: 'user',
		type: 'user',
		content,
	};
}

function createAssistantMessage(id: string, runId?: string): AssistantMessage {
	return {
		id,
		role: 'assistant',
		type: 'assistant',
		content: '',
		runId,
		state: 'thinking',
		tools: [],
	};
}

function updateAssistantMessage(
	state: AssistantChatState,
	messageId: string,
	update: (message: AssistantMessage) => AssistantMessage
): AssistantChatState {
	return {
		...state,
		messages: state.messages.map((message) =>
			message.id === messageId && isAssistantMessage(message) ? update(message) : message
		),
	};
}

function activeAssistant(state: AssistantChatState): AssistantMessage | undefined {
	return state.messages.find(
		(message) => message.id === state.activeAssistantId && isAssistantMessage(message)
	) as AssistantMessage | undefined;
}

function ensureAssistantForRun(
	state: AssistantChatState,
	runId: string
): { state: AssistantChatState; message: AssistantMessage } {
	const current = activeAssistant(state);
	if (current) {
		if (current.runId && current.runId !== runId) return { state, message: current };
		const nextMessage = current.runId ? current : { ...current, runId };
		if (nextMessage === current) return { state, message: current };
		const nextState = updateAssistantMessage(state, current.id, () => nextMessage);
		return { state: { ...nextState, activeRunId: runId }, message: nextMessage };
	}

	const existing = state.messages.find(
		(message) => isAssistantMessage(message) && message.runId === runId
	) as AssistantMessage | undefined;
	if (existing) {
		return {
			state: { ...state, activeAssistantId: existing.id, activeRunId: runId },
			message: existing,
		};
	}

	const message = createAssistantMessage(`assistant-${runId}`, runId);
	return {
		state: {
			...state,
			messages: [...removePendingMessages(state.messages), message],
			activeAssistantId: message.id,
			activeRunId: runId,
		},
		message,
	};
}

function applyResponseEvent(
	state: AssistantChatState,
	event: AssistantResponseEvent,
	_receivedAtMs: number
): AssistantChatState {
	if (state.activeRunId && state.activeRunId !== event.runId) return state;
	const ensured = ensureAssistantForRun(state, event.runId);
	if (ensured.message.runId && ensured.message.runId !== event.runId) return state;

	if (event.type === 'run_state') {
		return updateAssistantMessage(ensured.state, ensured.message.id, (message) => ({
			...message,
			runId: event.runId,
			state: event.state,
			errorText: event.state === 'error' ? (event.label ?? message.errorText) : message.errorText,
		}));
	}

	if (event.type === 'reasoning_summary') {
		return ensured.state;
	}

	if (event.type === 'text_delta') {
		if (!event.delta) return ensured.state;
		return updateAssistantMessage(
			{ ...ensured.state, activeAssistantId: ensured.message.id, activeRunId: event.runId },
			ensured.message.id,
			(message) => ({
				...message,
				runId: event.runId,
				state: 'answering',
				content: message.content + event.delta,
			})
		);
	}

	const tools = applyAssistantResponseEventToTools(ensured.message.tools, event);
	if (!tools) return ensured.state;

	return updateAssistantMessage(
		{ ...ensured.state, activeAssistantId: ensured.message.id, activeRunId: event.runId },
		ensured.message.id,
		(message) => ({
			...message,
			runId: event.runId,
			state: 'using_tools',
			tools,
		})
	);
}

function addToolResultToMessages(
	messages: readonly HomeChatMessage[],
	toolUseId: string | undefined,
	content: string | null | undefined,
	isError: boolean | undefined,
	status: AssistantToolCallStatus | undefined,
	output: unknown
): HomeChatMessage[] {
	if (!toolUseId) return [...messages];
	const resolvedStatus: AssistantToolCallStatus = status ?? (isError ? 'error' : 'ok');
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
		if (!isAssistantMessage(message)) continue;
		if (!message.tools.some((tool) => tool.toolCallId === toolUseId)) continue;

		const nextMessage: AssistantMessage = {
			...message,
			tools: updateAssistantToolPart(message.tools, toolUseId, {
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

export function historyToChatMessages(history: AssistantHistoryMessage[]): HomeChatMessage[] {
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
			.map(assistantToolPartFromHistoryBlock)
			.filter((tool): tool is AssistantToolPart => Boolean(tool));

		if (content.length === 0 && tools.length === 0) return;
		out.push({
			id: `assistant-history-${index}`,
			role: 'assistant',
			type: 'assistant',
			content,
			state: 'completed',
			tools,
		});
	});
	return out;
}

export function pendingToMultiSelectMessage(
	event: AssistantPendingEventPayload,
	createdAtMs: number
): HomeMultiSelectMessage | null {
	const { approvals, inputs } = event;
	if (approvals.length === 0 && inputs.length === 0) return null;

	const options: HomeMultiSelectOption[] = [
		...approvals.map((approval: AssistantPendingApproval) => ({
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
		...inputs.map((input: AssistantPendingInput) => ({
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
		id: `assistant-pending-${createdAtMs}`,
		role: 'assistant',
		type: 'multi-select',
		prompt: 'The assistant needs you to confirm or answer the following:',
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

export function assistantChatReducer(
	state: AssistantChatState,
	action: AssistantChatAction
): AssistantChatState {
	switch (action.type) {
		case 'submit_user_message': {
			const userMessage = createUserMessage(action.userMessageId, action.content);
			const assistantMessage = createAssistantMessage(action.assistantMessageId);
			return {
				messages: [...removePendingMessages(state.messages), userMessage, assistantMessage],
				activeAssistantId: assistantMessage.id,
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
			const current = activeAssistant(state);
			if (!current) return { ...state, messages: withPending };
			return updateAssistantMessage(
				{ ...state, messages: withPending },
				current.id,
				(message) => ({ ...message, state: 'waiting_for_approval' })
			);
		}
		case 'complete_active': {
			const current = activeAssistant(state);
			if (!current) {
				if (action.response.trim().length === 0) return state;
				const message: AssistantMessage = {
					...createAssistantMessage(`assistant-completed-${Date.now()}`),
					content: action.response,
					state: 'completed',
				};
				return { ...state, messages: [...removePendingMessages(state.messages), message] };
			}

			const nextState = updateAssistantMessage(state, current.id, (message) => ({
				...message,
				content: action.response.trim().length > 0 ? action.response : message.content,
				state:
					message.state === 'error' || message.state === 'cancelled'
						? message.state
						: 'completed',
			}));
			return { ...nextState, activeAssistantId: undefined, activeRunId: undefined };
		}
		case 'cancel_active': {
			const current = activeAssistant(state);
			if (!current) return state;
			const nextState = updateAssistantMessage(state, current.id, (message) => ({
				...message,
				state: 'cancelled',
				errorText: 'Cancelled.',
			}));
			return { ...nextState, activeAssistantId: undefined, activeRunId: undefined };
		}
		case 'error_active': {
			const current = activeAssistant(state);
			if (!current) {
				const message: AssistantMessage = {
					...createAssistantMessage(`assistant-error-${Date.now()}`),
					content: action.errorText,
					state: 'error',
					errorText: action.errorText,
				};
				return { ...state, messages: [...removePendingMessages(state.messages), message] };
			}

			const nextState = updateAssistantMessage(state, current.id, (message) => ({
				...message,
				content: message.content || action.errorText,
				state: 'error',
				errorText: action.errorText,
			}));
			return { ...nextState, activeAssistantId: undefined, activeRunId: undefined };
		}
		case 'restore_history': {
			const restored = historyToChatMessages(action.history);
			return {
				messages: restored.length > 0 ? [welcomeMessage, ...restored] : [welcomeMessage],
				activeAssistantId: undefined,
				activeRunId: undefined,
			};
		}
		case 'reset':
			return initialAssistantChatState;
	}
}
