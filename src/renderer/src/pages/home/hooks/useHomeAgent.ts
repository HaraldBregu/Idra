import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMode } from '@/contexts/chat-mode';
import { subscribeTrayChatMessage } from '@/tray-chat-events';
import type {
	ApprovalDecision,
	AgentPendingEventPayload,
	AgentPendingState,
	AgentResponseEvent,
} from '../../../../../shared/service';
import {
	defaultPendingSelections,
	inputAnswerKey,
	pendingToMultiSelectMessage,
	type ImmediateApprovalSelection,
	type HomeMultiSelectMessage,
	useHomeAgentContext,
} from '../context';

type WindowWithOptionalAgent = Window & {
	agent?: Window['agent'];
};

const HOME_AGENT_ID = 'main';

function getAgentApi(): Window['agent'] | undefined {
	return (window as WindowWithOptionalAgent).agent;
}

function messageId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useHomeAgent({
	setMode,
}: {
	readonly setMode: (mode: ChatMode) => void;
}) {
	const { chatState, dispatchChat } = useHomeAgentContext();
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [selectedOptions, setSelectedOptions] = useState<Record<string, readonly string[]>>({});
	const [pendingInputAnswers, setPendingInputAnswers] = useState<Record<string, string>>({});
	const requestIdRef = useRef(0);
	const requestActiveRef = useRef(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const focusInput = useCallback((): void => {
		inputRef.current?.focus();
	}, []);

	const switchToTyping = useCallback((): void => {
		setMode('chat');
		window.requestAnimationFrame(focusInput);
	}, [focusInput, setMode]);

	const useSuggestion = useCallback(
		(prompt: string): void => {
			setInput(prompt);
			setMode('chat');
			window.requestAnimationFrame(focusInput);
		},
		[focusInput, setMode]
	);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const agent = getAgentApi();
			if (!agent) {
				setHistoryLoading(false);
				return;
			}
			try {
				const history = await agent.getHistory();
				if (!cancelled) dispatchChat({ type: 'restore_history', history });
			} catch {
				if (!cancelled) dispatchChat({ type: 'restore_history', history: [] });
			} finally {
				if (!cancelled) setHistoryLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [dispatchChat]);

	const stopResponse = useCallback((): void => {
		requestIdRef.current += 1;
		requestActiveRef.current = false;
		setIsLoading(false);
		dispatchChat({ type: 'cancel_active', completedAtMs: Date.now() });
		void getAgentApi()?.cancel();
	}, [dispatchChat]);

	const sendPrompt = useCallback(
		async (prompt: string): Promise<void> => {
			const trimmed = prompt.trim();
			if (!trimmed) return;

			const requestId = requestIdRef.current + 1;
			requestIdRef.current = requestId;
			requestActiveRef.current = true;
			const submittedAtMs = Date.now();

			setInput('');
			setIsLoading(true);
			dispatchChat({
				type: 'submit_user_message',
				userMessageId: messageId('user'),
				agentMessageId: messageId('agent'),
				content: trimmed,
				submittedAtMs,
			});

			const agent = getAgentApi();
			if (!agent) {
				requestActiveRef.current = false;
				setIsLoading(false);
				dispatchChat({
					type: 'error_active',
					errorText: 'Agent API is unavailable.',
					completedAtMs: Date.now(),
				});
				return;
			}

			try {
				const response = await agent.send(trimmed);
				if (requestIdRef.current !== requestId) return;
				requestActiveRef.current = false;
				setIsLoading(false);
				dispatchChat({ type: 'complete_active', response, completedAtMs: Date.now() });
			} catch (error) {
				if (requestIdRef.current !== requestId) return;
				requestActiveRef.current = false;
				setIsLoading(false);
				const message = error instanceof Error ? error.message : 'Agent request failed.';
				dispatchChat({ type: 'error_active', errorText: message, completedAtMs: Date.now() });
			}
		},
		[dispatchChat]
	);

	useEffect(() => {
		return subscribeTrayChatMessage((message) => {
			setMode('chat');
			void sendPrompt(message);
		});
	}, [sendPrompt, setMode]);

	const applyPendingEvent = useCallback(
		(event: AgentPendingEventPayload): void => {
			if (event.agentId !== HOME_AGENT_ID) return;
			const pendingMessage = pendingToMultiSelectMessage(event, Date.now());

			if (pendingMessage) {
				setSelectedOptions((current) =>
					current[pendingMessage.id]
						? current
						: {
								...current,
								[pendingMessage.id]: defaultPendingSelections(pendingMessage),
							}
				);
			} else {
				setSelectedOptions({});
				setPendingInputAnswers({});
			}

			dispatchChat({ type: 'set_pending_message', message: pendingMessage });
		},
		[dispatchChat]
	);

	useEffect(() => {
		const agent = getAgentApi();
		if (!agent) return;

		const offPending = agent.onPending(applyPendingEvent);

		const offResponse = agent.onResponse((event: AgentResponseEvent) => {
			if (!requestActiveRef.current) return;
			if (event.agentId !== HOME_AGENT_ID) return;
			dispatchChat({ type: 'apply_response_event', event, receivedAtMs: Date.now() });
		});

		let cancelled = false;
		void agent.getPending().then((pending: AgentPendingState) => {
			if (!cancelled) applyPendingEvent({ agentId: HOME_AGENT_ID, ...pending });
		}).catch(() => undefined);

		return () => {
			cancelled = true;
			offPending();
			offResponse();
		};
	}, [applyPendingEvent, dispatchChat]);

	const handleSubmit = useCallback((): void => {
		if (isLoading) {
			stopResponse();
			return;
		}
		void sendPrompt(input);
	}, [input, isLoading, sendPrompt, stopResponse]);

	const resetChat = useCallback((): void => {
		requestIdRef.current += 1;
		requestActiveRef.current = false;
		setInput('');
		setIsLoading(false);
		setSelectedOptions({});
		setPendingInputAnswers({});
		dispatchChat({ type: 'reset' });
		void getAgentApi()?.reset().catch((error: unknown) => {
			const message = error instanceof Error ? error.message : 'Reset failed.';
			dispatchChat({ type: 'error_active', errorText: message, completedAtMs: Date.now() });
		});
	}, [dispatchChat]);

	const selectApprovalOption = useCallback(
		(messageId: string, approvalId: string, optionId: string): void => {
			setSelectedOptions((current) => {
				const selected = current[messageId] ?? [];
				const next = [
					...selected.filter((id) => !id.startsWith(`approval:${approvalId}:`)),
					optionId,
				];
				return { ...current, [messageId]: next };
			});
		},
		[]
	);

	const updatePendingInputAnswer = useCallback(
		(messageId: string, inputId: string, value: string): void => {
			setPendingInputAnswers((current) => ({
				...current,
				[inputAnswerKey(messageId, inputId)]: value,
			}));
		},
		[]
	);

	const submitMultiSelect = useCallback(
		async (
			message: HomeMultiSelectMessage,
			immediateApproval?: ImmediateApprovalSelection
		): Promise<void> => {
			const selected = new Set(selectedOptions[message.id] ?? []);
			if (immediateApproval) selected.add(immediateApproval.optionId);

			try {
				const agent = getAgentApi();
				if (!agent) throw new Error('Agent API is unavailable.');
				const approvals = new Map<string, ApprovalDecision>();
				const inputLabels: string[] = [];

				for (const option of message.options) {
					if (option.kind === 'approval' && option.approvalId) {
						if (!approvals.has(option.approvalId)) approvals.set(option.approvalId, 'deny');
						if (selected.has(option.id)) approvals.set(option.approvalId, option.decision ?? 'deny');
					} else if (option.kind === 'input' && option.inputId) {
						const answer = pendingInputAnswers[inputAnswerKey(message.id, option.inputId)] ?? '';
						await agent.resolveInput(option.inputId, answer);
						inputLabels.push(option.label);
					}
				}

				for (const [id, decision] of approvals) {
					await agent.resolveApproval(id, decision);
				}

				const selectedLabels = message.options
					.filter((option) => selected.has(option.id))
					.map((option) => option.label);
				const labels = [...selectedLabels, ...inputLabels];

				dispatchChat({
					type: 'append_user_message',
					messageId: messageId('user'),
					content: labels.length > 0 ? `Selected: ${labels.join(', ')}` : 'No actions selected.',
				});
				setSelectedOptions((current) => {
					const next = { ...current };
					delete next[message.id];
					return next;
				});
				setPendingInputAnswers((current) => {
					const next = { ...current };
					for (const option of message.options) {
						if (option.kind === 'input' && option.inputId) {
							delete next[inputAnswerKey(message.id, option.inputId)];
						}
					}
					return next;
				});
			} catch (error) {
				const messageText = error instanceof Error ? error.message : 'Selection failed.';
				dispatchChat({
					type: 'error_active',
					errorText: messageText,
					completedAtMs: Date.now(),
				});
			}
		},
		[dispatchChat, pendingInputAnswers, selectedOptions]
	);

	useEffect(() => {
		return () => {
			requestIdRef.current += 1;
			requestActiveRef.current = false;
		};
	}, []);

	useEffect(() => {
		const handler = (event: KeyboardEvent): void => {
			if ((event.metaKey || event.ctrlKey) && event.key === '/') {
				event.preventDefault();
				switchToTyping();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [switchToTyping]);

	return {
		chatState,
		handleSubmit,
		historyLoading,
		input,
		inputRef,
		isLoading,
		pendingInputAnswers,
		resetChat,
		selectedOptions,
		selectApprovalOption,
		setInput,
		submitMultiSelect,
		switchToTyping,
		updatePendingInputAnswer,
		useSuggestion,
	};
}
