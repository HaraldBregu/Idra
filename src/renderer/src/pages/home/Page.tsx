import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, AudioLines, Mic, Plus, RotateCcw, Square } from 'lucide-react';
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
} from '@/components/ui/prompt-input';
import { ScrollButton } from '@/components/ui/scroll-button';
import { useChatMode } from '@/contexts/chat-mode';
import { cn } from '@/lib/utils';
import { AssistantTextMessage } from './components/AssistantTextMessage';
import { PendingMessage } from './components/PendingMessage';
import { ReferenceConversation } from './components/ReferenceConversation';
import { UserMessage } from './components/UserMessage';
import { Provider } from './context';
import { useHomeAssistant } from './hooks';

function AttachmentButton(): ReactElement {
	return (
		<PromptInputAction tooltip="Add attachment">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Add attachment"
			>
				<Plus className="size-4" />
			</Button>
		</PromptInputAction>
	);
}

function ResetButton({ onReset }: { readonly onReset: () => void }): ReactElement {
	return (
		<PromptInputAction tooltip="Reset conversation">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Reset conversation"
				onClick={onReset}
			>
				<RotateCcw className="size-4" />
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
		<PromptInputAction tooltip="Voice assistant">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-lg text-foreground hover:bg-muted"
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
				className="size-9 overflow-hidden rounded-lg bg-foreground text-background hover:bg-foreground/90"
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
	const { setMode } = useChatMode();
	const assistant = useHomeAssistant({ setMode });
	const showReferenceConversation =
		assistant.chatState.messages.length <= 1 &&
		!assistant.isLoading &&
		!assistant.historyLoading;
	const canReset = assistant.chatState.messages.length > 1 || assistant.isLoading;
	const canSubmit = assistant.input.trim().length > 0;
	const handlePrimaryAction = (): void => {
		if (assistant.isLoading || canSubmit) {
			assistant.handleSubmit();
			return;
		}
		setMode('voice');
	};

	return (
		<PageContainer className="overflow-hidden text-foreground">
			<div className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground">
				<ChatContainerRoot className="min-h-0 p-0 [scrollbar-gutter:auto]" aria-live="polite">
					<ChatContainerContent
						className={cn(
							'mx-auto min-h-full w-full max-w-4xl gap-5 px-6',
							showReferenceConversation ? 'justify-start pb-6 pt-7' : 'pb-8 pt-6'
						)}
					>
						{showReferenceConversation ? (
							<ReferenceConversation onUseSuggestion={assistant.useSuggestion} />
						) : (
							<>
								{assistant.chatState.messages.map((message) => {
									if (message.role === 'user') {
										return <UserMessage key={message.id} content={message.content} />;
									}

									if (message.type === 'multi-select') {
										return (
											<PendingMessage
												key={message.id}
												message={message}
												selectedOptions={assistant.selectedOptions[message.id] ?? []}
												inputAnswers={assistant.pendingInputAnswers}
												onInputAnswerChange={assistant.updatePendingInputAnswer}
												onSelectApprovalOption={assistant.selectApprovalOption}
												onSubmit={(pendingMessage) =>
													void assistant.submitMultiSelect(pendingMessage)
												}
											/>
										);
									}

									return (
										<AssistantTextMessage
											key={message.id}
											message={message}
											isStreaming={
												assistant.isLoading &&
												message.id === assistant.chatState.activeAssistantId
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
				<div className="flex shrink-0 justify-center bg-gradient-to-t from-background via-background/95 to-transparent px-5 pb-4 pt-4">
					<PromptInput
						value={assistant.input}
						onValueChange={assistant.setInput}
						isLoading={assistant.isLoading}
						maxHeight={360}
						onSubmit={assistant.handleSubmit}
						textareaRef={assistant.inputRef}
						leadingAction={<AttachmentButton />}
						className="w-full"
						actions={
							<PromptInputActions className="justify-end gap-1.5">
								<AnimatePresence initial={false}>
									{canReset && (
										<motion.div
											key="reset"
											initial={{ opacity: 0, scale: 0.7, x: -6 }}
											animate={{ opacity: 1, scale: 1, x: 0 }}
											exit={{ opacity: 0, scale: 0.7, x: -6 }}
											transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.4 }}
											className="shrink-0"
										>
											<ResetButton onReset={assistant.resetChat} />
										</motion.div>
									)}
								</AnimatePresence>
								<VoiceButton onVoiceModeRequest={() => setMode('voice')} />
								<SubmitButton
									isLoading={assistant.isLoading}
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
