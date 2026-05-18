import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, AudioLines, Mic, Plus, Square } from 'lucide-react';
import { PageContainer } from '@/components/app/base/page';
import { Button } from '@/components/ui/button';
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
	type PromptInputVoiceMode,
} from '@/components/ui/prompt-input';
import { ScrollButton } from '@/components/ui/scroll-button';
import { useChatMode } from '@/contexts/chat-mode';
import { cn } from '@/lib/utils';
import { AgentTextMessage } from './components/AgentTextMessage';
import { PendingMessage } from './components/PendingMessage';
import { ReferenceConversation } from './components/ReferenceConversation';
import { UserMessage } from './components/UserMessage';
import { Provider } from './context';
import { useHomeAgent } from './hooks';

function AttachmentButton(): ReactElement {
	return (
		<PromptInputAction tooltip="Add attachment">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Add attachment"
			>
				<Plus className="size-4" />
			</Button>
		</PromptInputAction>
	);
}

function VoiceButton({
	onVoiceModeRequest,
}: {
	readonly onVoiceModeRequest: () => void;
}): ReactElement {
	return (
		<PromptInputAction tooltip="Voice agent">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full text-foreground hover:bg-muted"
				aria-label="Switch to voice"
				onClick={onVoiceModeRequest}
			>
				<Mic className="size-4" />
			</Button>
		</PromptInputAction>
	);
}

function SubmitButton({
	isLoading,
	canSubmit,
	onAction,
}: {
	readonly isLoading: boolean;
	readonly canSubmit: boolean;
	readonly onAction: () => void;
}): ReactElement {
	const label = isLoading ? 'Stop generation' : canSubmit ? 'Send message' : 'Start voice conversation';
	const iconKey = isLoading ? 'stop' : canSubmit ? 'send' : 'voice';
	const icon = isLoading ? (
		<Square className="size-4 fill-current" />
	) : canSubmit ? (
		<ArrowUp className="size-4" />
	) : (
		<AudioLines className="size-4" />
	);

	return (
		<PromptInputAction tooltip={label}>
			<Button
				type="button"
				variant="default"
				size="icon"
				className="size-9 overflow-hidden rounded-full bg-foreground text-background hover:bg-foreground/90"
				aria-label={label}
				onClick={onAction}
			>
				<AnimatePresence mode="wait" initial={false}>
					<motion.span
						key={iconKey}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
						className="flex items-center justify-center"
					>
						{icon}
					</motion.span>
				</AnimatePresence>
			</Button>
		</PromptInputAction>
	);
}

function PageContent(): ReactElement {
	const { mode, setMode } = useChatMode();
	const agent = useHomeAgent({ setMode });
	const [voiceMode, setVoiceMode] = useState<PromptInputVoiceMode | null>(null);
	const showReferenceConversation =
		agent.chatState.messages.length <= 1 &&
		!agent.isLoading &&
		!agent.historyLoading;
	const canSubmit = agent.input.trim().length > 0;

	useEffect(() => {
		if (mode === 'chat') setVoiceMode(null);
	}, [mode]);

	const returnToChat = (): void => {
		setVoiceMode(null);
		setMode('chat');
	};

	const startVoiceConversation = (): void => {
		setVoiceMode('conversation');
		setMode('voice');
	};

	const startDictation = (): void => {
		setVoiceMode('dictation');
		setMode('voice');
	};

	const confirmDictation = (): void => {
		const shouldSubmit = agent.input.trim().length > 0;
		returnToChat();
		if (shouldSubmit) agent.handleSubmit();
	};

	const handlePrimaryAction = (): void => {
		if (agent.isLoading || canSubmit) {
			agent.handleSubmit();
			return;
		}
		startVoiceConversation();
	};

	return (
		<PageContainer className="overflow-hidden text-foreground">
			<div className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground">
				<ChatContainerRoot className="min-h-0 p-0 [scrollbar-gutter:auto]" aria-live="polite">
					<ChatContainerContent
						className={cn(
							'mx-auto min-h-full w-full max-w-4xl gap-5',
							showReferenceConversation ? 'justify-start pt-7' : 'pt-6'
						)}
					>
						{showReferenceConversation ? (
							<ReferenceConversation onUseSuggestion={agent.useSuggestion} />
						) : (
							<>
								{agent.chatState.messages.map((message) => {
									if (message.role === 'user') {
										return <UserMessage key={message.id} content={message.content} />;
									}

									if (message.type === 'multi-select') {
										return (
											<PendingMessage
												key={message.id}
												message={message}
												selectedOptions={agent.selectedOptions[message.id] ?? []}
												inputAnswers={agent.pendingInputAnswers}
												onInputAnswerChange={agent.updatePendingInputAnswer}
												onSelectApprovalOption={agent.selectApprovalOption}
												onSubmit={(pendingMessage, immediateApproval) =>
													void agent.submitMultiSelect(pendingMessage, immediateApproval)
												}
											/>
										);
									}

									return (
										<AgentTextMessage
											key={message.id}
											message={message}
											isStreaming={
												agent.isLoading &&
												message.id === agent.chatState.activeAgentId
											}
										/>
									);
								})}
							</>
						)}
						<ChatContainerScrollAnchor />
					</ChatContainerContent>
					<div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
						<ScrollButton
							type="button"
							aria-label="Scroll to latest"
							className="pointer-events-auto"
						/>
					</div>
				</ChatContainerRoot>
				<div className="z-20 flex shrink-0 justify-center border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
					<PromptInput
						value={agent.input}
						onValueChange={agent.setInput}
						isLoading={agent.isLoading}
						maxHeight={360}
						onSubmit={agent.handleSubmit}
						textareaRef={agent.inputRef}
						leadingAction={<AttachmentButton />}
						voiceMode={voiceMode}
						onVoiceEnd={returnToChat}
						onVoiceCancel={returnToChat}
						onVoiceConfirm={confirmDictation}
						className="w-full"
						actions={
							<PromptInputActions className="justify-end gap-1.5">
								<VoiceButton onVoiceModeRequest={startDictation} />
								<SubmitButton
									isLoading={agent.isLoading}
									canSubmit={canSubmit}
									onAction={handlePrimaryAction}
								/>
							</PromptInputActions>
						}
					>
						<PromptInputTextarea placeholder="Ask anything" aria-label="Message Friday" />
					</PromptInput>
				</div>
			</div>
		</PageContainer>
	);
}

function Page(): ReactElement {
	return (
		<Provider>
			<PageContent />
		</Provider>
	);
}

export default Page;
