import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentToolCallStatus,
	ModelReasoningEffort,
} from '../../../../../shared/agents/service';
import type { AgentChatAction } from './actions';
import {
	agentSkillUsageFromName,
	mergeAgentSkillUsages,
} from './skill-usage';
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
	type AgentReasoningSummary,
	type HomeChatMessage,
	type UserMessage,
} from './state';

type CapabilityResolutionEvent = Extract<
	AgentResponseEvent,
	{ type: 'capability_resolution_result' }
>;
type ReasoningSummaryEvent = Extract<AgentResponseEvent, { type: 'reasoning_summary' }>;

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
	startedAtMs?: number,
	options: {
		reasoningEffort?: ModelReasoningEffort;
		lightContext?: boolean;
	} = {}
): AgentMessage {
	return {
		id,
		role: 'agent',
		type: 'agent',
		content: '',
		runId,
		state: 'thinking',
		tools: [],
		requestedEffort: options.reasoningEffort,
		lightContext: options.lightContext,
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
			messages: [...state.messages, message],
			activeAgentId: message.id,
			activeRunId: runId,
		},
		message,
	};
}

function isTerminalRunState(state: AgentMessage['state']): boolean {
	return state === 'completed' || state === 'cancelled' || state === 'error';
}

function upsertReasoningSummary(
	summaries: readonly AgentReasoningSummary[] | undefined,
	event: ReasoningSummaryEvent
): AgentReasoningSummary[] {
	const next = {
		id: event.id,
		title: event.title,
		summary: event.summary,
		state: event.state,
	};
	if (!summaries) return [next];
	const index = summaries.findIndex((summary) => summary.id === event.id);
	if (index === -1) return [...summaries, next];
	return summaries.map((summary, currentIndex) => (currentIndex === index ? next : summary));
}

function skillUsagesFromCapability(
	event: CapabilityResolutionEvent
): NonNullable<AgentMessage['selectedSkills']> {
	return event.skills
		.map((skill) => agentSkillUsageFromName(skill.name, skill.reason))
		.filter((skill): skill is NonNullable<ReturnType<typeof agentSkillUsageFromName>> =>
			Boolean(skill)
		);
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

	if (event.type === 'model_selected') {
		return updateAgentMessage(ensured.state, ensured.message.id, (message) => ({
			...message,
			runId: event.runId,
			model: {
				providerId: event.providerId,
				model: event.model,
				effort: event.effort,
			},
			startedAtMs: message.startedAtMs ?? receivedAtMs,
		}));
	}

	if (event.type === 'capability_resolution_start') {
		return updateAgentMessage(ensured.state, ensured.message.id, (message) => ({
			...message,
			runId: event.runId,
			state: message.state === 'thinking' ? 'thinking' : message.state,
			startedAtMs: message.startedAtMs ?? receivedAtMs,
		}));
	}

	if (event.type === 'capability_resolution_result') {
		const selectedSkills = skillUsagesFromCapability(event);
		return updateAgentMessage(ensured.state, ensured.message.id, (message) => ({
			...message,
			runId: event.runId,
			capability: {
				tools: event.tools,
				connectorTools: event.connectorTools,
				skills: event.skills,
				directAnswer: event.directAnswer,
				decision: event.decision,
			},
			selectedSkills: mergeAgentSkillUsages(message.selectedSkills ?? [], selectedSkills),
			startedAtMs: message.startedAtMs ?? receivedAtMs,
		}));
	}

	if (event.type === 'reasoning_summary') {
		return updateAgentMessage(ensured.state, ensured.message.id, (message) => ({
			...message,
			runId: event.runId,
			state: message.content.length > 0 ? message.state : 'reasoning',
			reasoning: upsertReasoningSummary(message.reasoning, event),
			startedAtMs: message.startedAtMs ?? receivedAtMs,
		}));
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
				action.submittedAtMs,
				{
					reasoningEffort: action.reasoningEffort,
					lightContext: action.lightContext,
				}
			);
			return {
				messages: [...state.messages, userMessage, agentMessage],
				activeAgentId: agentMessage.id,
			};
		}
		case 'append_user_message':
			return {
				...state,
				messages: [...state.messages, createUserMessage(action.messageId, action.content)],
			};
		case 'apply_response_event':
			return applyResponseEvent(state, action.event, action.receivedAtMs);
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
				return { ...state, messages: [...state.messages, message] };
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
				return { ...state, messages: [...state.messages, message] };
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
