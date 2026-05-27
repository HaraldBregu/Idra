import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMode } from '@/contexts/chat-mode';
import type {
	AgentResponseEvent,
	AgentSendRuntimeOptions,
	ModelReasoningEffort,
} from '../../../../../shared/agents/service';
import { useHomeAgentContext } from '../context';

type WindowWithOptionalAgent = Window & {
	agent?: Window['agent'];
};

const HOME_AGENT_ID = 'main';
const HIGH_REASONING_PATTERN =
	/\b(architecture|analy[sz]e|debug|diagnose|investigate|refactor|review|root cause|security|performance|race condition|trade-?off|think hard|deep dive|step by step|plan|design|why|failing|broken|error|exception|stack trace)\b/i;
const MEDIUM_REASONING_PATTERN =
	/\b(compare|explain|summari[sz]e|estimate|strategy|approach|implement|change|improve|optimi[sz]e|test|typescript|react|electron|ipc)\b/i;
const LOW_REASONING_PATTERN =
	/\b(quick|brief|short|simple|just answer|no reasoning|without reasoning|don't think|do not think|no thinking|fast answer)\b/i;

function getAgentApi(): Window['agent'] | undefined {
	return (window as WindowWithOptionalAgent).agent;
}

function messageId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resolvePromptReasoningEffort(prompt: string): {
	effort: ModelReasoningEffort;
	lightContext: boolean;
} {
	const hasCodeContext =
		prompt.includes('```') ||
		/\b(src\/|tests?\/|package\.json|tsconfig|console|trace|diff)\b/i.test(prompt);
	if (LOW_REASONING_PATTERN.test(prompt)) {
		return { effort: 'none', lightContext: true };
	}
	if (HIGH_REASONING_PATTERN.test(prompt) || hasCodeContext || prompt.length > 500) {
		return { effort: 'high', lightContext: false };
	}
	if (MEDIUM_REASONING_PATTERN.test(prompt) || prompt.length > 220) {
		return { effort: 'medium', lightContext: false };
	}
	return { effort: 'none', lightContext: true };
}

function runtimeOptionsForPrompt(prompt: string): AgentSendRuntimeOptions {
	return resolvePromptReasoningEffort(prompt);
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
			const runtimeOptions = runtimeOptionsForPrompt(trimmed);

			setInput('');
			setIsLoading(true);
			dispatchChat({
				type: 'submit_user_message',
				userMessageId: messageId('user'),
				agentMessageId: messageId('agent'),
				content: trimmed,
				submittedAtMs,
				reasoningEffort: runtimeOptions.effort,
				lightContext: runtimeOptions.lightContext,
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
				const response = await agent.send(trimmed, runtimeOptions);
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
		const agent = getAgentApi();
		if (!agent) return;

		const offResponse = agent.onResponse((event: AgentResponseEvent) => {
			if (!requestActiveRef.current) return;
			if (event.agentId !== HOME_AGENT_ID) return;
			dispatchChat({ type: 'apply_response_event', event, receivedAtMs: Date.now() });
		});

		return () => {
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
		dispatchChat({ type: 'reset' });
		void getAgentApi()?.reset().catch((error: unknown) => {
			const message = error instanceof Error ? error.message : 'Reset failed.';
			dispatchChat({ type: 'error_active', errorText: message, completedAtMs: Date.now() });
		});
	}, [dispatchChat]);

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
		resetChat,
		setInput,
		switchToTyping,
		useSuggestion,
	};
}
