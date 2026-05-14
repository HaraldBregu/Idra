import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
	ArrowUp,
	Bot,
	CheckCircle2,
	Copy,
	Paperclip,
	ShieldCheck,
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
import { ScrollButton } from '@/components/prompt-kit/scroll-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/app/base/page';
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

const suggestions: readonly string[] = [
	'Review the current changes',
	'Explain this project structure',
	'Find the next failing test',
	'Draft a focused implementation plan',
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
	const [selectedOptions, setSelectedOptions] = useState<Record<string, readonly string[]>>({});
	const requestIdRef = useRef(0);

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
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const stopResponse = (): void => {
		requestIdRef.current += 1;
		setIsLoading(false);
	};

	const sendPrompt = async (prompt: string): Promise<void> => {
		const trimmed = prompt.trim();
		if (!trimmed) return;

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setInput('');
		setIsLoading(true);
		setMessages((current) => [
			...removeMultiSelectMessages(current),
			createTextMessage('user', trimmed),
		]);

		try {
			const response = await window.assistant.send(trimmed);
			if (requestIdRef.current !== requestId) return;
			if (response.trim().length > 0) {
				setMessages((current) => [...current, createTextMessage('assistant', response)]);
			}
		} catch (error) {
			if (requestIdRef.current !== requestId) return;
			const message = error instanceof Error ? error.message : 'Assistant request failed.';
			setMessages((current) => [...current, createTextMessage('assistant', message)]);
		} finally {
			if (requestIdRef.current === requestId) {
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
		const offResponse = window.assistant.onResponse((_event: AssistantResponseDelta) => {
			// Streaming text deltas — currently surfaced only as the final
			// response from send(). Hook here to render live tokens.
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

	const showSuggestions = messages.length <= 1 && !isLoading;

	return (
		<PageContainer className="text-foreground">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
						<Bot className="size-5" />
					</div>
					<div className="min-w-0">
						<h1 className="truncate text-sm font-semibold">Friday Assistant</h1>
						<p className="truncate text-xs text-muted-foreground">
							Workspace-aware help for coding, research, and decisions
						</p>
					</div>
				</div>
				<div className="hidden shrink-0 items-center gap-2 sm:flex">
					<Badge variant="outline" className="gap-1">
						<CheckCircle2 className="size-3" />
						Ready
					</Badge>
					<Badge variant="secondary" className="gap-1">
						<ShieldCheck className="size-3" />
						Approvals guarded
					</Badge>
				</div>
			</header>
			<ChatContainerRoot className="min-h-0 flex-1">
				<ChatContainerContent className="w-full gap-5">
					{messages.map((message) =>
						message.role === 'user' ? (
							<Message key={message.id} className="justify-end">
								<MessageContent className="max-w-[min(78%,48rem)] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm">
									{message.content}
								</MessageContent>
							</Message>
						) : (
							<Message key={message.id} className="justify-start">
								<MessageAvatar src="/avatars/ai.png" alt="AI" fallback="AI" />
								<div className="flex w-full max-w-[min(82%,52rem)] flex-col gap-2">
									{message.type === 'text' ? (
										<>
											<MessageContent
												markdown
												className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 shadow-xs"
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
										<div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
											<div className="space-y-1">
												<Badge variant="outline">Action required</Badge>
												<p className="text-sm font-medium">{message.prompt}</p>
											</div>
											<div className="flex flex-col gap-2">
												{message.options.map((option) => (
													<label
														key={option.id}
														className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:bg-muted/50"
													>
														<input
															type={option.kind === 'approval' ? 'radio' : 'checkbox'}
															name={
																option.kind === 'approval'
																	? `${message.id}:${option.approvalId}`
																	: option.id
															}
															className="mt-1 size-4 accent-primary"
															checked={(selectedOptions[message.id] ?? []).includes(option.id)}
															onChange={() =>
																option.kind === 'approval' && option.approvalId
																	? selectApprovalOption(message.id, option.approvalId, option.id)
																	: toggleOption(message.id, option.id)
															}
														/>
														<span className="min-w-0">
															<span className="block font-medium">{option.label}</span>
															<span className="block break-words text-xs text-muted-foreground">
																{option.description}
															</span>
														</span>
													</label>
												))}
											</div>
											<Button
												className="self-start"
												size="sm"
												onClick={() => void submitMultiSelect(message)}
											>
												Submit selection
											</Button>
										</div>
									)}
								</div>
							</Message>
						)
					)}
					{isLoading && (
						<Message className="justify-start">
							<MessageAvatar src="/avatars/ai.png" alt="AI" fallback="AI" />
							<div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-muted-foreground shadow-xs">
								<Loader variant="typing" size="md" />
								<Loader variant="text-shimmer" text="Thinking" size="sm" />
							</div>
						</Message>
					)}
					<ChatContainerScrollAnchor />
				</ChatContainerContent>
				<ScrollButton className="absolute bottom-4 right-6 shadow-sm" variant="secondary" />
			</ChatContainerRoot>

			<div className="border-t border-border bg-background/95 px-4 pt-3">
				{showSuggestions && (
					<div className="mx-auto mb-3 flex w-full max-w-3xl flex-wrap gap-2">
						{suggestions.map((s) => (
							<PromptSuggestion key={s} onClick={() => void sendPrompt(s)}>
								<Sparkles className="size-3" />
								{s}
							</PromptSuggestion>
						))}
					</div>
				)}
				<PromptInput
					value={input}
					onValueChange={setInput}
					isLoading={isLoading}
					onSubmit={handleSubmit}
					className="mx-auto mb-4 w-full max-w-3xl bg-card shadow-sm"
				>
					<PromptInputTextarea placeholder="Ask Friday anything..." />
					<PromptInputActions className="justify-between pt-2">
						<PromptInputAction tooltip="Attach file">
							<Button variant="ghost" size="icon-sm" className="rounded-full">
								<Paperclip className="size-4" />
							</Button>
						</PromptInputAction>
						<PromptInputAction tooltip={isLoading ? 'Stop generation' : 'Send message'}>
							<Button
								variant="default"
								size="icon"
								className="h-8 w-8 rounded-full"
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
		</PageContainer>
	);
}

export default HomePage;
