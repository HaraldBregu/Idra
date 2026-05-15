import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import {
	ArrowUp,
	Code2,
	Copy,
	GitPullRequest,
	ListChecks,
	Paperclip,
	Search,
	Sparkles,
	Square,
} from 'lucide-react';
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from '@/components/prompt-kit/chat-container';
import { Loader } from '@/components/prompt-kit/loader';
import {
	Message,
	MessageAction,
	MessageActions,
	MessageAvatar,
	MessageContent,
} from '@/components/prompt-kit/message';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input';
import { PromptSuggestion } from '@/components/prompt-kit/prompt-suggestion';
import { ResponseStream } from '@/components/prompt-kit/response-stream';
import { ScrollButton } from '@/components/prompt-kit/scroll-button';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/app/base/page';
import { cn } from '@/lib/utils';
import type {
	ApprovalDecision,
	AssistantHistoryMessage,
	AssistantPendingApproval,
	AssistantPendingEventPayload,
	AssistantPendingInput,
	AssistantResponseDelta,
} from '../../../../shared/service';

interface TextChatMessage {
	readonly id: string;
	readonly role: 'user' | 'assistant';
	readonly type: 'text';
	readonly content: string;
}

interface MultiSelectOption {
	readonly id: string;
	readonly kind: 'approval' | 'input';
	readonly label: string;
	readonly description: string;
	readonly approvalId?: string;
	readonly decision?: ApprovalDecision;
	readonly inputId?: string;
}

interface MultiSelectChatMessage {
	readonly id: string;
	readonly role: 'assistant';
	readonly type: 'multi-select';
	readonly prompt: string;
	readonly options: readonly MultiSelectOption[];
}

type ChatMessage = TextChatMessage | MultiSelectChatMessage;

interface SuggestionItem {
	readonly label: string;
	readonly prompt: string;
	readonly icon: LucideIcon;
}

function createTextMessage(role: TextChatMessage['role'], content: string): TextChatMessage {
	return {
		id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		role,
		type: 'text',
		content,
	};
}

const welcomeMessage: ChatMessage = {
	id: 'assistant-welcome',
	role: 'assistant',
	type: 'text',
	content:
		'Ready when you are. Ask Friday to inspect code, make a change, explain a file, or help plan the next step.',
};

const initialMessages: readonly ChatMessage[] = [welcomeMessage];

const suggestions: readonly SuggestionItem[] = [
	{
		label: 'Review changes',
		prompt: 'Review the current changes',
		icon: GitPullRequest,
	},
	{
		label: 'Explain structure',
		prompt: 'Explain this project structure',
		icon: Code2,
	},
	{
		label: 'Find failing test',
		prompt: 'Find the next failing test',
		icon: Search,
	},
	{
		label: 'Plan implementation',
		prompt: 'Draft a focused implementation plan',
		icon: ListChecks,
	},
];

function historyToChatMessages(history: AssistantHistoryMessage[]): ChatMessage[] {
	const out: ChatMessage[] = [];
	history.forEach((m, idx) => {
		if (m.role !== 'user' && m.role !== 'assistant') return;
		if (typeof m.content !== 'string' || m.content.length === 0) return;
		out.push({ id: `${m.role}-history-${idx}`, role: m.role, type: 'text', content: m.content });
	});
	return out;
}

function pendingToMultiSelectMessage(
	approvals: AssistantPendingApproval[],
	inputs: AssistantPendingInput[]
): MultiSelectChatMessage {
	const options: MultiSelectOption[] = [
		...approvals.map((a) => ({
			id: `approval:${a.id}:allow-once`,
			kind: 'approval' as const,
			label: `${a.toolName}: Allow once`,
			description: a.command ?? JSON.stringify(a.argsPreview ?? {}),
			approvalId: a.id,
			decision: 'allow-once' as const,
		})),
		...approvals
			.filter((a) => a.allowedDecisions.includes('allow-always'))
			.map((a) => ({
				id: `approval:${a.id}:allow-always`,
				kind: 'approval' as const,
				label: `${a.toolName}: Allow always`,
				description: a.command ?? JSON.stringify(a.argsPreview ?? {}),
				approvalId: a.id,
				decision: 'allow-always' as const,
			})),
		...approvals.map((a) => ({
			id: `approval:${a.id}:deny`,
			kind: 'approval' as const,
			label: `${a.toolName}: Deny`,
			description: a.command ?? JSON.stringify(a.argsPreview ?? {}),
			approvalId: a.id,
			decision: 'deny' as const,
		})),
		...inputs.map((i) => ({
			id: `input:${i.id}`,
			kind: 'input' as const,
			label: 'ask_human',
			description:
				i.question + (i.suggestions ? `\nSuggestions: ${i.suggestions.join(' | ')}` : ''),
			inputId: i.id,
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

function removeMultiSelectMessages(messages: readonly ChatMessage[]): ChatMessage[] {
	return messages.filter((message) => message.type !== 'multi-select');
}

function defaultPendingSelections(message: MultiSelectChatMessage): string[] {
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
	const [messages, setMessages] = useState<readonly ChatMessage[]>(initialMessages);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [historyLoading, setHistoryLoading] = useState(true);
	// null = not streaming; non-null string = streaming in progress (may be empty before first delta)
	const [streamingContent, setStreamingContent] = useState<string | null>(null);
	const [selectedOptions, setSelectedOptions] = useState<Record<string, readonly string[]>>({});
	const requestIdRef = useRef(0);
	// Ref so the onResponse listener can check without stale closure issues
	const isStreamingRef = useRef(false);
	const promptContainerRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();

	const focusInput = useCallback((): void => {
		promptContainerRef.current?.querySelector('textarea')?.focus();
	}, []);

	// Restore history on mount
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
				// keep welcome only
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
		isStreamingRef.current = false;
		setIsLoading(false);
		setStreamingContent(null);
		// Best-effort server-side cancellation
		void window.assistant.cancel();
	};

	const sendPrompt = async (prompt: string): Promise<void> => {
		const trimmed = prompt.trim();
		if (!trimmed) return;

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		isStreamingRef.current = true;
		setInput('');
		setIsLoading(true);
		setStreamingContent(null);
		setMessages((current) => [
			...removeMultiSelectMessages(current),
			createTextMessage('user', trimmed),
		]);

		try {
			const response = await window.assistant.send(trimmed);
			if (requestIdRef.current !== requestId) return;
			isStreamingRef.current = false;
			setStreamingContent(null);
			if (response.trim().length > 0) {
				setMessages((current) => [...current, createTextMessage('assistant', response)]);
			}
		} catch (error) {
			if (requestIdRef.current !== requestId) return;
			isStreamingRef.current = false;
			setStreamingContent(null);
			const message = error instanceof Error ? error.message : 'Assistant request failed.';
			setMessages((current) => [...current, createTextMessage('assistant', message)]);
		} finally {
			if (requestIdRef.current === requestId) {
				isStreamingRef.current = false;
				setIsLoading(false);
			}
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
			if (isStreamingRef.current && event.delta) {
				setStreamingContent((prev) => (prev === null ? event.delta : prev + event.delta));
			}
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

	const submitMultiSelect = async (message: MultiSelectChatMessage): Promise<void> => {
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
					// For now: send a fixed placeholder so the run can resume. A
					// richer UI will collect free-text or pick a suggestion.
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
		};
	}, []);

	// ⌘/ (or Ctrl+/) focuses the chat input from anywhere in the page
	useEffect(() => {
		const handler = (event: KeyboardEvent): void => {
			if ((event.metaKey || event.ctrlKey) && event.key === '/') {
				event.preventDefault();
				focusInput();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [focusInput]);

	// Auto-focus input on mount so users can type immediately
	useEffect(() => {
		focusInput();
	}, [focusInput]);

	const msgTransition = useCallback(
		(index: number) => ({
			duration: prefersReducedMotion ? 0 : 0.18,
			ease: [0, 0, 0.2, 1] as [number, number, number, number],
			delay: prefersReducedMotion ? 0 : Math.min(index * 0.04, 0.2),
		}),
		[prefersReducedMotion]
	);

	// Don't show suggestions while history is loading or chat is active
	const showSuggestions = messages.length <= 1 && !isLoading && !historyLoading;

	return (
		<PageContainer className="overflow-hidden text-foreground">
			<div className="relative flex min-h-0 flex-1 flex-col">
				<ChatContainerRoot className="mx-auto min-h-0 w-full max-w-4xl flex-1">
					<ChatContainerContent
						className={cn(
							'min-h-full w-full px-4',
							showSuggestions ? 'justify-center py-8' : 'gap-4 pb-6 pt-5'
						)}
					>
						{showSuggestions ? (
							<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
								<div className="flex flex-col items-center gap-3 text-center">
									<div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-card/80 text-muted-foreground shadow-sm">
										<Sparkles className="size-5" />
									</div>
									<div className="space-y-1">
										<h1 className="text-xl font-semibold">What should Friday do next?</h1>
										<p className="mx-auto max-w-xl text-sm text-muted-foreground">
											Start with a focused request for code review, project context, tests, or
											implementation planning.
										</p>
									</div>
								</div>
								<div className="grid gap-2 sm:grid-cols-2">
									{suggestions.map(({ label, prompt, icon: Icon }) => (
										<PromptSuggestion
											key={label}
											onClick={() => void sendPrompt(prompt)}
											className="h-auto items-start justify-start gap-3 whitespace-normal rounded-xl border-border/80 bg-card/70 px-3 py-3 text-left shadow-sm hover:bg-accent"
										>
											<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
												<Icon className="size-4" />
											</span>
											<span className="min-w-0 leading-tight">
												<span className="block text-sm font-medium text-foreground">{label}</span>
												<span className="block truncate text-xs text-muted-foreground">
													{prompt}
												</span>
											</span>
										</PromptSuggestion>
									))}
								</div>
							</div>
						) : (
							<>
								{messages.map((message, index) =>
									message.role === 'user' ? (
										<motion.div
											key={message.id}
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											transition={msgTransition(index)}
										>
											<Message className="justify-end">
												<MessageContent className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground shadow-sm sm:max-w-[72%]">
													{message.content}
												</MessageContent>
											</Message>
										</motion.div>
									) : (
										<motion.div
											key={message.id}
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											transition={msgTransition(index)}
										>
											<Message className="items-start justify-start">
												<MessageAvatar
													src="/avatars/ai.png"
													alt="AI"
													fallback="AI"
													className="mt-0.5 size-7 border border-border bg-card"
												/>
												<div className="flex min-w-0 max-w-[calc(100%-2.5rem)] flex-col gap-2 sm:max-w-[44rem]">
													{message.type === 'text' ? (
														<>
															<MessageContent
																markdown
																className="rounded-2xl border border-border/80 bg-card/80 px-3.5 py-2.5 shadow-sm backdrop-blur"
															>
																{message.content}
															</MessageContent>
															<MessageActions className="self-start">
																<MessageAction tooltip="Copy">
																	<Button
																		variant="ghost"
																		size="icon-sm"
																		onClick={() => copyMessage(message.content)}
																	>
																		<Copy className="size-3.5" />
																	</Button>
																</MessageAction>
															</MessageActions>
														</>
													) : (
														<div
															className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/80 p-3 shadow-sm backdrop-blur"
															role="group"
															aria-label={message.prompt}
														>
															<p className="text-sm font-medium">{message.prompt}</p>
															<div className="flex flex-col gap-2" role={message.options.some((o) => o.kind === 'approval') ? 'radiogroup' : 'group'}>
																{message.options.map((option) => {
																	const isSelected = (selectedOptions[message.id] ?? []).includes(option.id);
																	const handleChange = (): void => {
																		if (option.kind === 'approval' && option.approvalId) {
																			selectApprovalOption(message.id, option.approvalId, option.id);
																		} else {
																			toggleOption(message.id, option.id);
																		}
																	};

																	return (
																		<button
																			key={option.id}
																			type="button"
																			role={option.kind === 'approval' ? 'radio' : 'checkbox'}
																			aria-checked={isSelected}
																			onClick={handleChange}
																			className={cn(
																				'flex w-full cursor-pointer items-start gap-3 rounded-xl border p-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
																				isSelected
																					? 'border-primary/40 bg-primary/8 text-foreground'
																					: 'border-border/80 bg-background/80 hover:bg-muted/60'
																			)}
																		>
																			<span
																				className={cn(
																					'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
																					option.kind === 'approval' ? 'rounded-full' : 'rounded-sm',
																					isSelected
																						? 'border-primary bg-primary text-primary-foreground'
																						: 'border-border bg-transparent'
																				)}
																				aria-hidden
																			>
																				{isSelected && (
																					<span className={cn('block bg-current', option.kind === 'approval' ? 'size-1.5 rounded-full' : 'size-2 rounded-sm')} />
																				)}
																			</span>
																			<span className="min-w-0 flex-1">
																				<span className="block font-medium leading-snug">{option.label}</span>
																				<span className="mt-0.5 block break-words text-xs leading-normal text-muted-foreground">
																					{option.description}
																				</span>
																			</span>
																		</button>
																	);
																})}
															</div>
															<Button
																className="self-start"
																size="sm"
																onClick={() => void submitMultiSelect(message)}
															>
																Confirm
															</Button>
														</div>
													)}
												</div>
											</Message>
										</motion.div>
									)
								)}
								{/* Live streaming message — visible once first token arrives */}
								{isLoading && streamingContent !== null && streamingContent.length > 0 && (
									<motion.div
										key="streaming"
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
									>
										<Message className="items-start justify-start">
											<MessageAvatar
												src="/avatars/ai.png"
												alt="AI"
												fallback="AI"
												className="mt-0.5 size-7 border border-border bg-card"
											/>
											<div className="flex min-w-0 max-w-[calc(100%-2.5rem)] flex-col gap-2 sm:max-w-[44rem]">
												<MessageContent
													markdown
													className="rounded-2xl border border-border/80 bg-card/80 px-3.5 py-2.5 shadow-sm backdrop-blur"
												>
													{streamingContent}
												</MessageContent>
											</div>
										</Message>
									</motion.div>
								)}

								{/* Typing indicator — shown while waiting for first streaming token */}
								{isLoading && (streamingContent === null || streamingContent.length === 0) && (
									<motion.div
										key="loading"
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
									>
										<Message className="items-start justify-start">
											<MessageAvatar
												src="/avatars/ai.png"
												alt="AI"
												fallback="AI"
												className="mt-0.5 size-7 border border-border bg-card"
											/>
											<div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-3.5 py-2.5 text-muted-foreground shadow-sm backdrop-blur">
												<Loader variant="typing" size="md" />
												<Loader variant="text-shimmer" text="Thinking" size="sm" />
											</div>
										</Message>
									</motion.div>
								)}
							</>
						)}
						<ChatContainerScrollAnchor className={showSuggestions ? 'hidden' : undefined} />
					</ChatContainerContent>
					{!showSuggestions && (
						<div className="pointer-events-none absolute inset-x-0 bottom-4 px-4">
							<div className="mx-auto flex w-full max-w-4xl justify-end">
								<ScrollButton className="pointer-events-auto shadow-sm" variant="secondary" />
							</div>
						</div>
					)}
				</ChatContainerRoot>

				{/* Container ref is used to query the textarea for programmatic focus */}
				<div
					ref={promptContainerRef}
					className="shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-4 pt-6"
				>
					<PromptInput
						value={input}
						onValueChange={setInput}
						isLoading={isLoading}
						onSubmit={handleSubmit}
						className="mx-auto w-full max-w-3xl rounded-2xl border-border/80 bg-card/80 shadow-lg shadow-black/5 backdrop-blur-xl"
					>
						<PromptInputTextarea
							className="min-h-[52px] px-2 pt-2 text-sm"
							placeholder="Ask Friday anything…"
						/>
						<PromptInputActions className="justify-between px-1 pt-2">
							<PromptInputAction tooltip="Attach file">
								<Button variant="ghost" size="icon-sm" className="rounded-full">
									<Paperclip className="size-4" />
								</Button>
							</PromptInputAction>
							<PromptInputAction tooltip={isLoading ? 'Stop generation' : 'Send message'}>
								<Button
									variant="default"
									size="icon"
									className="size-8 rounded-full"
									onClick={handleSubmit}
								>
									{isLoading ? (
										<Square className="size-4 fill-current" />
									) : (
										<ArrowUp className="size-4" />
									)}
								</Button>
							</PromptInputAction>
						</PromptInputActions>
					</PromptInput>
				</div>
			</div>
		</PageContainer>
	);
}

export default HomePage;
