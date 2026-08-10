import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMode } from '@/contexts/chat-mode';
import { useChatSession } from '@/contexts/chat-session';
import type { ModelReasoningEffort } from '@/lib/compat';
import type { AgentResponseEvent } from '@/lib/compat';
import { useHomeAgentContext } from '../context';
import { expandTaskCommand } from './commands';
import { filesToAgentInput } from './files';

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

export function resolvePromptReasoningEffort(prompt: string): {
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

function runtimeOptionsForPrompt(prompt: string) {
	return resolvePromptReasoningEffort(prompt);
}

export function useHomeAgent({ setMode }: { readonly setMode: (mode: ChatMode) => void }) {
	const { chatState, dispatchChat } = useHomeAgentContext();
	const { sessionId, setSessionId } = useChatSession();
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [historyLoading, setHistoryLoading] = useState(false);
	const requestIdRef = useRef(0);
	const requestActiveRef = useRef(false);
	const localInteractionRef = useRef(false);
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

	const stopResponse = useCallback((): void => {
		requestIdRef.current += 1;
		requestActiveRef.current = false;
		setIsLoading(false);
		void getAgentApi()
			?.cancel()
			.catch(() => undefined);
		dispatchChat({ type: 'cancel_active', completedAtMs: Date.now() });
	}, [dispatchChat]);

	const sendPrompt = useCallback(
		async (prompt: string, files: File[] = []): Promise<void> => {
			const trimmed = expandTaskCommand(prompt.trim());
			if (!trimmed && files.length === 0) return;

			const requestId = requestIdRef.current + 1;
			requestIdRef.current = requestId;
			requestActiveRef.current = true;
			localInteractionRef.current = true;
			const submittedAtMs = Date.now();

			setInput('');
			setIsLoading(true);
			dispatchChat({
				type: 'submit_user_message',
				userMessageId: messageId('user'),
				agentMessageId: messageId('agent'),
				content: trimmed || files.map((file) => file.name).join(', '),
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
				const inputFiles = files.length > 0 ? await filesToAgentInput(files) : [];
				const runtimeOptions = {
					...runtimeOptionsForPrompt(trimmed),
					sessionId,
					...(inputFiles.length > 0 ? { files: inputFiles } : {}),
				};
				let response = '';
				const onEvent = (event: AgentResponseEvent): void => {
					if (requestIdRef.current !== requestId || event.agentId !== HOME_AGENT_ID) return;
					if (event.type === 'text_delta') response += event.delta;
					dispatchChat({ type: 'apply_response_event', event, receivedAtMs: Date.now() });
				};
				response = await agent.send(trimmed, runtimeOptions, onEvent);
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
		[dispatchChat, sessionId]
	);

	// useEffect(() => {
	// 	const agent = getAgentApi();
	// 	if (!agent) return;
	//
	// 	const offResponse = agent.onResponse((event: AgentResponseEvent) => {
	// 		if (!requestActiveRef.current) return;
	// 		if (event.agentId !== HOME_AGENT_ID) return;
	// 		dispatchChat({ type: 'apply_response_event', event, receivedAtMs: Date.now() });
	// 	});
	//
	// 	return () => {
	// 		offResponse();
	// 	};
	// }, [dispatchChat]);

	const handleSubmit = useCallback(
		(files?: File[]): void => {
			if (isLoading) {
				stopResponse();
				return;
			}
			void sendPrompt(input, files);
		},
		[input, isLoading, sendPrompt, stopResponse]
	);

	const resetChat = useCallback((): void => {
		requestIdRef.current += 1;
		requestActiveRef.current = false;
		localInteractionRef.current = true;
		setInput('');
		setIsLoading(false);
		dispatchChat({ type: 'reset' });
	}, [dispatchChat]);

	useEffect(() => {
		let cancelled = false;
		const agent = getAgentApi();
		if (!agent) return;

		requestIdRef.current += 1;
		requestActiveRef.current = false;
		localInteractionRef.current = false;
		setIsLoading(false);
		setHistoryLoading(true);
		agent
			.getLastMessages(sessionId)
			.then((history) => {
				if (cancelled || localInteractionRef.current) return;
				dispatchChat({ type: 'restore_history', history });
			})
			.catch(() => undefined)
			.finally(() => {
				if (!cancelled) setHistoryLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [dispatchChat, sessionId]);

	useEffect(() => {
		return () => {
			requestIdRef.current += 1;
			requestActiveRef.current = false;
		};
	}, []);

	useEffect(() => {
		const handler = (event: KeyboardEvent): void => {
			if (
				(event.metaKey || event.ctrlKey) &&
				!event.altKey &&
				!event.shiftKey &&
				event.key.toLowerCase() === 'n'
			) {
				event.preventDefault();
				setSessionId(crypto.randomUUID());
				return;
			}
			if ((event.metaKey || event.ctrlKey) && event.key === '/') {
				event.preventDefault();
				switchToTyping();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [setSessionId, switchToTyping]);

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
