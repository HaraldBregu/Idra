import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HomeChatView, HomeVoiceView } from '@/components/app/home';
import type {
	HomeChatMessage,
	HomeMultiSelectMessage,
	HomeMultiSelectOption,
	HomeTextMessage,
} from '@/components/app/home';
import { PageContainer } from '@/components/app/base/page';
import { useChatMode } from '@/contexts/chat-mode';
import type {
	ApprovalDecision,
	AssistantHistoryMessage,
	AssistantPendingApproval,
	AssistantPendingEventPayload,
	AssistantPendingInput,
	AssistantResponseDelta,
} from '../../../../shared/service';

function createTextMessage(role: HomeTextMessage['role'], content: string): HomeTextMessage {
	return {
		id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		role,
		type: 'text',
		content,
	};
}

const welcomeMessage: HomeChatMessage = {
	id: 'assistant-welcome',
	role: 'assistant',
	type: 'text',
	content:
		'Ready when you are. Ask Friday to inspect code, make a change, explain a file, or help plan the next step.',
};

const initialMessages: readonly HomeChatMessage[] = [welcomeMessage];

function historyToChatMessages(history: AssistantHistoryMessage[]): HomeChatMessage[] {
	const out: HomeChatMessage[] = [];
	history.forEach((message, index) => {
		if (message.role !== 'user' && message.role !== 'assistant') return;
		if (typeof message.content !== 'string' || message.content.length === 0) return;
		out.push({
			id: `${message.role}-history-${index}`,
			role: message.role,
			type: 'text',
			content: message.content,
		});
	});
	return out;
}

function pendingToMultiSelectMessage(
	approvals: AssistantPendingApproval[],
	inputs: AssistantPendingInput[]
): HomeMultiSelectMessage {
	const options: HomeMultiSelectOption[] = [
		...approvals.map((approval) => ({
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
		...inputs.map((input) => ({
			id: `input:${input.id}`,
			kind: 'input' as const,
			label: 'ask_human',
			description:
				input.question +
				(input.suggestions ? `\nSuggestions: ${input.suggestions.join(' | ')}` : ''),
			inputId: input.id,
		})),
	];

	return {
		id: `assistant-pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		role: 'assistant',
		type: 'multi-select',
		prompt: 'The assistant needs you to confirm or answer the following:',
		options,
	};
}

function removeMultiSelectMessages(messages: readonly HomeChatMessage[]): HomeChatMessage[] {
	return messages.filter((message) => message.type !== 'multi-select');
}

function defaultPendingSelections(message: HomeMultiSelectMessage): string[] {
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

function HomePage(): ReactElement {
	const { mode, setMode } = useChatMode();
	const [messages, setMessages] = useState<readonly HomeChatMessage[]>(initialMessages);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [streamText, setStreamText] = useState('');
	const [streamStarted, setStreamStarted] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState<Record<string, readonly string[]>>({});
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

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const history = await window.assistant.getHistory();
				if (cancelled) return;
				const restored = historyToChatMessages(history);
				if (restored.length > 0) {
					setMessages([welcomeMessage, ...restored]);
				}
			} catch {
				// Keep the reference-ready empty chat state.
			} finally {
				if (!cancelled) setHistoryLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const stopResponse = (): void => {
		requestIdRef.current += 1;
		requestActiveRef.current = false;
		setStreamText('');
		setStreamStarted(false);
		setIsLoading(false);
		void window.assistant.cancel();
	};

	const sendPrompt = async (prompt: string): Promise<void> => {
		const trimmed = prompt.trim();
		if (!trimmed) return;

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		requestActiveRef.current = true;

		setInput('');
		setStreamText('');
		setIsLoading(true);
		setStreamStarted(false);
		setMessages((current) => [
			...removeMultiSelectMessages(current),
			createTextMessage('user', trimmed),
		]);

		try {
			const response = await window.assistant.send(trimmed);
			if (requestIdRef.current !== requestId) return;
			requestActiveRef.current = false;
			setStreamText('');
			setStreamStarted(false);
			setIsLoading(false);
			if (response.trim().length > 0) {
				setMessages((current) => [...current, createTextMessage('assistant', response)]);
			}
		} catch (error) {
			if (requestIdRef.current !== requestId) return;
			requestActiveRef.current = false;
			setStreamText('');
			setStreamStarted(false);
			setIsLoading(false);
			const message = error instanceof Error ? error.message : 'Assistant request failed.';
			setMessages((current) => [...current, createTextMessage('assistant', message)]);
		}
	};

	useEffect(() => {
		const offPending = window.assistant.onPending((event: AssistantPendingEventPayload) => {
			const pendingMessage =
				event.approvals.length === 0 && event.inputs.length === 0
					? null
					: pendingToMultiSelectMessage(event.approvals, event.inputs);

			if (pendingMessage) {
				setSelectedOptions((current) => ({
					...current,
					[pendingMessage.id]: defaultPendingSelections(pendingMessage),
				}));
			}

			setMessages((current) => {
				const cleaned = removeMultiSelectMessages(current);
				if (!pendingMessage) return cleaned;
				return [...cleaned, pendingMessage];
			});
		});

		const offResponse = window.assistant.onResponse((event: AssistantResponseDelta) => {
			if (!requestActiveRef.current || !event.delta) return;
			setStreamText((current) => current + event.delta);
			setStreamStarted(true);
		});

		return () => {
			offPending();
			offResponse();
		};
	}, []);

	const handleSubmit = (): void => {
		if (isLoading) {
			stopResponse();
			return;
		}
		void sendPrompt(input);
	};

	const copyMessage = (content: string): void => {
		void navigator.clipboard?.writeText(content);
	};

	const toggleOption = (messageId: string, optionId: string): void => {
		setSelectedOptions((current) => {
			const selected = current[messageId] ?? [];
			const next = selected.includes(optionId)
				? selected.filter((id) => id !== optionId)
				: [...selected, optionId];
			return { ...current, [messageId]: next };
		});
	};

	const selectApprovalOption = (messageId: string, approvalId: string, optionId: string): void => {
		setSelectedOptions((current) => {
			const selected = current[messageId] ?? [];
			const next = [
				...selected.filter((id) => !id.startsWith(`approval:${approvalId}:`)),
				optionId,
			];
			return { ...current, [messageId]: next };
		});
	};

	const submitMultiSelect = async (message: HomeMultiSelectMessage): Promise<void> => {
		const selected = new Set(selectedOptions[message.id] ?? []);

		try {
			const approvals = new Map<string, ApprovalDecision>();

			for (const option of message.options) {
				if (option.kind === 'approval' && option.approvalId) {
					if (!approvals.has(option.approvalId)) approvals.set(option.approvalId, 'deny');
					if (selected.has(option.id)) {
						approvals.set(option.approvalId, option.decision ?? 'deny');
					}
				} else if (option.kind === 'input' && option.inputId) {
					await window.assistant.resolveInput(option.inputId, '');
				}
			}

			for (const [id, decision] of approvals) {
				await window.assistant.resolveApproval(id, decision);
			}

			const selectedLabels = message.options
				.filter((option) => selected.has(option.id))
				.map((option) => option.label);

			setMessages((current) => [
				...removeMultiSelectMessages(current),
				createTextMessage(
					'user',
					selectedLabels.length > 0
						? `Selected: ${selectedLabels.join(', ')}`
						: 'No actions selected.'
				),
			]);
			setSelectedOptions((current) => {
				const next = { ...current };
				delete next[message.id];
				return next;
			});
		} catch (error) {
			const messageText = error instanceof Error ? error.message : 'Selection failed.';
			setMessages((current) => [
				...removeMultiSelectMessages(current),
				createTextMessage('assistant', messageText),
			]);
		}
	};

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

	useEffect(() => {
		if (mode === 'chat') {
			focusInput();
		}
	}, [focusInput, mode]);

	return (
		<PageContainer className="overflow-hidden text-foreground">
			{mode === 'voice' ? (
				<HomeVoiceView onSwitchToTyping={switchToTyping} />
			) : (
				<HomeChatView
					messages={messages}
					selectedOptions={selectedOptions}
					input={input}
					isLoading={isLoading}
					historyLoading={historyLoading}
					streamText={streamText}
					streamStarted={streamStarted}
					inputRef={inputRef}
					onInputChange={setInput}
					onSubmit={handleSubmit}
					onCopyMessage={copyMessage}
					onToggleOption={toggleOption}
					onSelectApprovalOption={selectApprovalOption}
					onSubmitPending={(message) => void submitMultiSelect(message)}
					onVoiceModeRequest={() => setMode('voice')}
				/>
			)}
		</PageContainer>
	);
}

export default HomePage;
