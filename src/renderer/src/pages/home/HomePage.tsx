import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Message, MessageAvatar, MessageContent } from '@/components/prompt-kit/message';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input';
import { Button } from '@/components/ui/Button';
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
	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const requestIdRef = useRef(0);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ block: 'end' });
	}, [messages.length, isLoading]);

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

	const handleSubmit = async (): Promise<void> => {
		if (isLoading) {
			stopResponse();
			return;
		}

		const prompt = input.trim();
		if (!prompt) return;

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setInput('');
		setIsLoading(true);
		setMessages((current) => [...current, createMessage('user', prompt)]);

		try {
			const response = await window.assistant.send(prompt);
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

	const handleSubmitClick = (): void => {
		void handleSubmit();
	};

	useEffect(() => {
		return () => {
			requestIdRef.current += 1;
		};
	}, []);

	return (
		<div
			className="flex h-full flex-col text-foreground"
			style={{
				backgroundColor: '#0a0315',
				backgroundImage:
					'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg id=\'Artboard-5\' fill=\'%23262626\' fill-opacity=\'0.27\' fill-rule=\'nonzero\'%3E%3Cpath d=\'M6 18h12V6H6v12zM4 4h16v16H4V4z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
			}}
		>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
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
								<MessageContent markdown className="max-w-[80%] bg-transparent p-0">
									{message.content}
								</MessageContent>
							</Message>
						)
					)}
					{isLoading && (
						<Message className="justify-start">
							<MessageAvatar src="/avatars/ai.png" alt="AI" fallback="AI" />
							<MessageContent className="bg-transparent p-0 text-muted-foreground">
								Thinking...
							</MessageContent>
						</Message>
					)}
					<div ref={messagesEndRef} />
				</div>
			</div>

			<PromptInput
				value={input}
				onValueChange={setInput}
				isLoading={isLoading}
				onSubmit={handleSubmitClick}
				className="mx-auto mb-4 w-[calc(100%-2rem)] max-w-3xl"
			>
				<PromptInputTextarea placeholder="Ask me anything..." />
				<PromptInputActions className="justify-end pt-2">
					<PromptInputAction tooltip={isLoading ? 'Stop generation' : 'Send message'}>
						<Button
							variant="default"
							size="icon"
							className="h-8 w-8 rounded-full"
							onClick={handleSubmitClick}
						>
							{isLoading ? (
								<Square className="size-5 fill-current" />
							) : (
								<ArrowUp className="size-5" />
							)}
						</Button>
					</PromptInputAction>
				</PromptInputActions>
			</PromptInput>
		</div>
	);
}

export default HomePage;
