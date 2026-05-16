import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMode } from '@/contexts/chat-mode';
import type {
	ApprovalDecision,
	AssistantPendingEventPayload,
	AssistantResponseEvent,
} from '../../../../../shared/service';
import {
	defaultPendingSelections,
	inputAnswerKey,
	pendingToMultiSelectMessage,
	type HomeMultiSelectMessage,
	useHomeAssistantContext,
} from '../context';

type WindowWithOptionalAssistant = Window & {
	assistant?: Window['assistant'];
};

function getAssistantApi(): Window['assistant'] | undefined {
	return (window as WindowWithOptionalAssistant).assistant;
}

function messageId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useHomeAssistant({
	setMode,
}: {
	readonly setMode: (mode: ChatMode) => void;
}) {
	const { chatState, dispatchChat } = useHomeAssistantContext();
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
			const assistant = getAssistantApi();
			if (!assistant) {
				setHistoryLoading(false);
				return;
			}
			try {
				const history = await assistant.getHistory();
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
		void getAssistantApi()?.cancel();
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
				assistantMessageId: messageId('assistant'),
				content: trimmed,
				submittedAtMs,
			});

			const assistant = getAssistantApi();
			if (!assistant) {
				requestActiveRef.current = false;
				setIsLoading(false);
				dispatchChat({
					type: 'error_active',
					errorText: 'Assistant API is unavailable.',
					completedAtMs: Date.now(),
				});
				return;
			}

			try {
				const response = await assistant.send(trimmed);
				if (requestIdRef.current !== requestId) return;
				requestActiveRef.current = false;
				setIsLoading(false);
				dispatchChat({ type: 'complete_active', response, completedAtMs: Date.now() });
			} catch (error) {
				if (requestIdRef.current !== requestId) return;
				requestActiveRef.current = false;
				setIsLoading(false);
				const message = error instanceof Error ? error.message : 'Assistant request failed.';
				dispatchChat({ type: 'error_active', errorText: message, completedAtMs: Date.now() });
			}
		},
		[dispatchChat]
	);

	useEffect(() => {
		const assistant = getAssistantApi();
		if (!assistant) return;

		const offPending = assistant.onPending((event: AssistantPendingEventPayload) => {
			const pendingMessage = pendingToMultiSelectMessage(event, Date.now());

			if (pendingMessage) {
				setSelectedOptions((current) => ({
					...current,
					[pendingMessage.id]: defaultPendingSelections(pendingMessage),
				}));
			}

			dispatchChat({ type: 'set_pending_message', message: pendingMessage });
		});

		const offResponse = assistant.onResponse((event: AssistantResponseEvent) => {
			if (!requestActiveRef.current) return;
			dispatchChat({ type: 'apply_response_event', event, receivedAtMs: Date.now() });
		});

		return () => {
			offPending();
			offResponse();
		};
	}, [dispatchChat]);

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
		void getAssistantApi()?.reset().catch((error: unknown) => {
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
		async (message: HomeMultiSelectMessage): Promise<void> => {
			const selected = new Set(selectedOptions[message.id] ?? []);

			try {
				const assistant = getAssistantApi();
				if (!assistant) throw new Error('Assistant API is unavailable.');
				const approvals = new Map<string, ApprovalDecision>();
				const inputLabels: string[] = [];

				for (const option of message.options) {
					if (option.kind === 'approval' && option.approvalId) {
						if (!approvals.has(option.approvalId)) approvals.set(option.approvalId, 'deny');
						if (selected.has(option.id)) approvals.set(option.approvalId, option.decision ?? 'deny');
					} else if (option.kind === 'input' && option.inputId) {
						const answer = pendingInputAnswers[inputAnswerKey(message.id, option.inputId)] ?? '';
						await assistant.resolveInput(option.inputId, answer);
						inputLabels.push(option.label);
					}
				}

				for (const [id, decision] of approvals) {
					await assistant.resolveApproval(id, decision);
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
