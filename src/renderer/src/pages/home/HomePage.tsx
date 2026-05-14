import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
	ArrowUp,
	Brain,
	Copy,
	Info,
	Paperclip,
	RotateCcw,
	Search,
	Sparkles,
	Square,
	ThumbsDown,
	ThumbsUp,
} from 'lucide-react';
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from '@/components/prompt-kit/chat-container';
import {
	ChainOfThought,
	ChainOfThoughtContent,
	ChainOfThoughtItem,
	ChainOfThoughtStep,
	ChainOfThoughtTrigger,
} from '@/components/prompt-kit/chain-of-thought';
import { FeedbackBar } from '@/components/prompt-kit/feedback-bar';
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
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/prompt-kit/reasoning';
import { ScrollButton } from '@/components/prompt-kit/scroll-button';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/app/base/page';
import type { AssistantHistoryMessage } from '../../../../shared/service';

interface ChatMessage {
	readonly id: string;
	readonly role: 'user' | 'assistant';
	readonly content: string;
}

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
	return {
		id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		role,
		content,
	};
}

const welcomeMessage: ChatMessage = {
	id: 'assistant-welcome',
	role: 'assistant',
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
		out.push({ id: `${m.role}-history-${idx}`, role: m.role, content: m.content });
	});
	return out;
}

function HomePage(): ReactElement {
	const [messages, setMessages] = useState<readonly ChatMessage[]>(initialMessages);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [feedbackDismissed, setFeedbackDismissed] = useState<Record<string, boolean>>({});
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
		setMessages((current) => [...current, createMessage('user', trimmed)]);

		try {
			const response = await window.assistant.send(trimmed);
			if (requestIdRef.current !== requestId) return;
			setMessages((current) => [...current, createMessage('assistant', response)]);
		} catch (error) {
			if (requestIdRef.current !== requestId) return;
			const message = error instanceof Error ? error.message : 'Assistant request failed.';
			setMessages((current) => [...current, createMessage('assistant', message)]);
		} finally {
			if (requestIdRef.current === requestId) {
				setIsLoading(false);
			}
		}
	};

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

	const dismissFeedback = (id: string): void => {
		setFeedbackDismissed((prev) => ({ ...prev, [id]: true }));
	};

	useEffect(() => {
		return () => {
			requestIdRef.current += 1;
		};
	}, []);

	const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;
	const showSuggestions = messages.length <= 1 && !isLoading;

	return (
		<PageContainer className="text-foreground">
			<ChatContainerRoot className="min-h-0 flex-1">
				<ChatContainerContent className="w-full gap-5">
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
									{message.id !== 'assistant-welcome' && (
										<Reasoning>
											<ReasoningTrigger>Show reasoning</ReasoningTrigger>
											<ReasoningContent markdown className="border-l-2 border-border pl-3">
												{`Considered intent, retrieved relevant context, drafted a structured answer, then refined for clarity.`}
											</ReasoningContent>
										</Reasoning>
									)}
									{message.id !== 'assistant-welcome' && (
										<ChainOfThought>
											<ChainOfThoughtStep defaultOpen>
												<ChainOfThoughtTrigger leftIcon={<Search className="size-3" />}>
													Analyzing the request
												</ChainOfThoughtTrigger>
												<ChainOfThoughtContent>
													<ChainOfThoughtItem>Parsed user intent from prompt.</ChainOfThoughtItem>
													<ChainOfThoughtItem>Selected relevant capabilities.</ChainOfThoughtItem>
												</ChainOfThoughtContent>
											</ChainOfThoughtStep>
											<ChainOfThoughtStep>
												<ChainOfThoughtTrigger leftIcon={<Brain className="size-3" />}>
													Composing response
												</ChainOfThoughtTrigger>
												<ChainOfThoughtContent>
													<ChainOfThoughtItem>
														Drafted answer using available context.
													</ChainOfThoughtItem>
												</ChainOfThoughtContent>
											</ChainOfThoughtStep>
										</ChainOfThought>
									)}
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
										<MessageAction tooltip="Helpful">
											<Button variant="ghost" size="icon-sm">
												<ThumbsUp className="size-3.5" />
											</Button>
										</MessageAction>
										<MessageAction tooltip="Not helpful">
											<Button variant="ghost" size="icon-sm">
												<ThumbsDown className="size-3.5" />
											</Button>
										</MessageAction>
										<MessageAction tooltip="Regenerate">
											<Button variant="ghost" size="icon-sm">
												<RotateCcw className="size-3.5" />
											</Button>
										</MessageAction>
									</MessageActions>
									{message.id === lastAssistantId &&
										message.id !== 'assistant-welcome' &&
										!feedbackDismissed[message.id] && (
											<FeedbackBar
												title="Was this response helpful?"
												icon={<Info className="size-4 text-primary" />}
												onHelpful={() => dismissFeedback(message.id)}
												onNotHelpful={() => dismissFeedback(message.id)}
												onClose={() => dismissFeedback(message.id)}
											/>
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
					className="mb-4 w-full bg-transparent"
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
