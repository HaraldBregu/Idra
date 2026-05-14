import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Copy, Paperclip, Sparkles, Square } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/app/base/page';
import type {
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
	readonly label: string;
	readonly description: string;
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
		'I can help with a variety of tasks: answering questions, providing information, assisting with coding, and generating creative content. What would you like help with today?',
};

const initialMessages: readonly ChatMessage[] = [welcomeMessage];

const suggestions: readonly string[] = [
	'Explain quantum entanglement in simple terms',
	'Write a TypeScript debounce function',
	'Draft a polite follow-up email',
	'Summarize the latest research on LLMs',
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
			id: `approve:${a.id}`,
			label: a.toolName,
			description: typeof a.args === 'string' ? a.args : JSON.stringify(a.args ?? {}),
		})),
		...inputs.map((i) => ({
			id: `input:${i.id}`,
			label: 'ask_human',
			description: i.question + (i.suggestions ? `\nSuggestions: ${i.suggestions.join(' | ')}` : ''),
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
			setMessages((current) => {
				const cleaned = removeMultiSelectMessages(current);
				if (event.approvals.length === 0 && event.inputs.length === 0) return cleaned;
				return [...cleaned, pendingToMultiSelectMessage(event.approvals, event.inputs)];
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

	const submitMultiSelect = async (message: MultiSelectChatMessage): Promise<void> => {
		const selected = new Set(selectedOptions[message.id] ?? []);
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setIsLoading(true);

		try {
			let result: AssistantSendResult | undefined;
			for (const option of message.options) {
				result = selected.has(option.id)
					? await window.assistant.approve(option.id)
					: await window.assistant.reject(option.id);
			}
			if (requestIdRef.current !== requestId) return;
			const selectedLabels = message.options
				.filter((option) => selected.has(option.id))
				.map((option) => option.label);
			setMessages((current) => [
				...removeMultiSelectMessages(current),
				createTextMessage(
					'user',
					selectedLabels.length > 0 ? `Selected: ${selectedLabels.join(', ')}` : 'No actions selected.'
				),
				...(result ? resultToAssistantMessages(result) : []),
			]);
		} catch (error) {
			if (requestIdRef.current !== requestId) return;
			const messageText = error instanceof Error ? error.message : 'Selection failed.';
			setMessages((current) => [
				...removeMultiSelectMessages(current),
				createTextMessage('assistant', messageText),
			]);
		} finally {
			if (requestIdRef.current === requestId) {
				setIsLoading(false);
			}
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
			<ChatContainerRoot className="min-h-0 flex-1">
				<ChatContainerContent className="w-full gap-5 px-0">
					{messages.map((message) =>
						message.role === 'user' ? (
							<Message key={message.id} className="justify-end">
								<MessageContent className="max-w-[80%] bg-primary text-primary-foreground">
									{message.content}
								</MessageContent>
							</Message>
						) : (
							<Message key={message.id} className="justify-start">
								<MessageAvatar src="/avatars/ai.png" alt="AI" fallback="AI" />
								<div className="flex w-full max-w-[80%] flex-col gap-2">
									{message.type === 'text' ? (
										<>
											<MessageContent markdown className="bg-transparent p-0">
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
										<div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
											<p className="text-sm font-medium">{message.prompt}</p>
											<div className="flex flex-col gap-2">
												{message.options.map((option) => (
													<label
														key={option.id}
														className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 text-sm"
													>
														<input
															type="checkbox"
															className="mt-1 size-4 accent-primary"
															checked={(selectedOptions[message.id] ?? []).includes(option.id)}
															onChange={() => toggleOption(message.id, option.id)}
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
												disabled={isLoading}
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
							<div className="flex items-center gap-2 text-muted-foreground">
								<Loader variant="typing" size="md" />
								<Loader variant="text-shimmer" text="Thinking" size="sm" />
							</div>
						</Message>
					)}
					<ChatContainerScrollAnchor />
				</ChatContainerContent>
				<ScrollButton className="absolute bottom-4 right-6 shadow-sm" variant="secondary" />
			</ChatContainerRoot>

			<div className="px-4">
				{showSuggestions && (
					<div className="mb-3 flex w-full flex-wrap gap-2">
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
					className="mb-4 w-full"
				>
					<PromptInputTextarea placeholder="Ask me anything..." />
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
