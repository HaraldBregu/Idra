import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { PageContainer } from '@/components/app/base/page';
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import {
	PromptInput,
	PromptInputActions,
	PromptInputTextarea,
	PromptInputVoiceActions,
	type PromptInputVoiceMode,
} from '@/components/ui/prompt-input';
import { ScrollButton } from '@/components/ui/scroll-button';
import { useChatMode } from '@/contexts/chat-mode';
import { cn } from '@/lib/utils';
import { AgentTextMessage } from './components/AgentTextMessage';
import { AttachmentButton } from './components/AttachmentButton';
import { AttachmentTray, filesToAttachments, type PromptAttachment } from './components/AttachmentTray';
import { EmptyConversation } from './components/EmptyConversation';
import { PromptSuggestions } from './components/PromptSuggestions';
import { RecorderErrorMessage } from './components/RecorderErrorMessage';
import { SubmitButton } from './components/SubmitButton';
import { UserMessage } from './components/UserMessage';
import { Provider, welcomeMessage } from './context';
import { useHomeAgent, useRealtimeDictation, useVoiceButtonMode } from './hooks';

function PageContent(): ReactElement {
	const { mode, setMode } = useChatMode();
	const agent = useHomeAgent({ setMode });
	const dictation = useRealtimeDictation({
		value: agent.input,
		onValueChange: agent.setInput,
	});
	const voiceButtonMode = useVoiceButtonMode();
	const [voiceMode, setVoiceMode] = useState<PromptInputVoiceMode | null>(null);
	const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
	const visibleMessages = agent.chatState.messages.filter(
		(message) => message.id !== welcomeMessage.id
	);
	const showEmptyConversation =
		visibleMessages.length === 0 &&
		!agent.isLoading &&
		!agent.historyLoading;
	const showPromptSuggestions = showEmptyConversation && voiceMode === null;
	const canSubmit = agent.input.trim().length > 0;
	const showVoiceConversation = !canSubmit && !agent.isLoading;
	const dictationStatus = dictation.status;
	const cancelDictationSession = dictation.cancel;
	const dictationBusy =
		dictationStatus === 'checking-permission' ||
		dictationStatus === 'connecting' ||
		dictationStatus === 'finishing';

	useEffect(() => {
		if (mode !== 'chat') return;
		setVoiceMode(null);
		if (
			dictationStatus === 'checking-permission' ||
			dictationStatus === 'connecting' ||
			dictationStatus === 'recording'
		) {
			void cancelDictationSession();
		}
	}, [cancelDictationSession, dictationStatus, mode]);

	const removeAttachment = useCallback((id: string): void => {
		setAttachments((current) =>
			current.filter((attachment) => {
				if (attachment.id !== id) return true;
				if (attachment.url) {
					URL.revokeObjectURL(attachment.url);
				}
				return false;
			})
		);
	}, []);

	const returnToChat = (): void => {
		setVoiceMode(null);
		setMode('chat');
	};

	const startVoiceConversation = (): void => {
		setVoiceMode('conversation');
		setMode('voice');
	};

	const startSpeechToText = async (): Promise<void> => {
		const nextVoiceMode: PromptInputVoiceMode =
			voiceButtonMode === 'record' ? 'recording' : 'dictation';
		const started = await dictation.start();
		if (!started) {
			setMode('chat');
			return;
		}
		setVoiceMode(nextVoiceMode);
		setMode('voice');
	};

	const cancelDictation = async (): Promise<void> => {
		await dictation.cancel();
		returnToChat();
	};

	const confirmDictation = async (): Promise<void> => {
		await dictation.finish();
		returnToChat();
	};

	return (
		<PageContainer className="overflow-hidden text-foreground">
			<div className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground">
				<ChatContainerRoot className="min-h-0 p-0 [scrollbar-gutter:auto]" aria-live="polite">
					<ChatContainerContent
						className={cn(
							'mx-auto w-full max-w-4xl gap-5 px-2',
							showEmptyConversation
								? 'h-full min-h-0 justify-center overflow-hidden pb-36 pt-12'
								: 'min-h-full pb-28 pt-6'
						)}
					>
						{showEmptyConversation ? (
							<>
								<EmptyConversation />
								{showPromptSuggestions ? (
									<PromptSuggestions onUseSuggestion={agent.useSuggestion} />
								) : null}
							</>
						) : (
							<>
								{visibleMessages.map((message, index) => {
									const previous = index > 0 ? visibleMessages[index - 1] : null;
									const isPreviousMessage = index < visibleMessages.length - 1;
									const showAssistantHeader = !previous || previous.role !== 'agent';
									const groupedAssistantClassName = showAssistantHeader ? undefined : '-mt-5';

									if (message.role === 'user') {
										return (
											<UserMessage
												key={message.id}
												content={message.content}
												collapseLongContent={isPreviousMessage}
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
											showHeader={showAssistantHeader}
											collapseLongContent={isPreviousMessage}
											className={groupedAssistantClassName}
										/>
									);
								})}
							</>
						)}
						<ChatContainerScrollAnchor className={showEmptyConversation ? 'h-0' : undefined} />
					</ChatContainerContent>
					<div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
						<ScrollButton
							type="button"
							aria-label="Scroll to latest"
							className="pointer-events-auto"
						/>
					</div>
				</ChatContainerRoot>
				<div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 py-3">
					<div className="w-full max-w-[96rem]">
						<RecorderErrorMessage message={dictation.errorMessage} />
						<AttachmentTray attachments={attachments} onRemove={removeAttachment} />
						<PromptInput
							value={agent.input}
							onValueChange={agent.setInput}
							isLoading={agent.isLoading}
							maxHeight={360}
							onSubmit={agent.handleSubmit}
							textareaRef={agent.inputRef}
							leadingAction={<AttachmentButton />}
							voiceMode={voiceMode}
							voiceElapsedMs={
								voiceMode === 'dictation' || voiceMode === 'recording'
									? dictation.elapsedMs
									: undefined
							}
							voiceMuted={
								voiceMode === 'dictation' || voiceMode === 'recording'
									? dictation.isMuted
									: undefined
							}
							voiceMediaStream={
								voiceMode === 'dictation' || voiceMode === 'recording'
									? dictation.stream
									: null
							}
							onVoiceMutedChange={
								voiceMode === 'dictation' || voiceMode === 'recording'
									? dictation.setMuted
									: undefined
							}
							onVoiceEnd={returnToChat}
							onVoiceCancel={() => void cancelDictation()}
							onVoiceConfirm={() => void confirmDictation()}
							onFilesChange={(files) =>
								setAttachments((current) => [...current, ...filesToAttachments(files)])
							}
							wrapperClassName="max-w-none"
							className="w-full"
							actions={
								<PromptInputActions className="justify-end gap-1.5">
									<PromptInputVoiceActions
										speechToTextMode={voiceButtonMode}
										onSpeechToText={startSpeechToText}
										speechToTextDisabled={dictationBusy || agent.isLoading}
										onVoiceConversation={startVoiceConversation}
										voiceConversationDisabled
										showVoiceConversation={showVoiceConversation}
									/>
									<SubmitButton
										isLoading={agent.isLoading}
										canSubmit={canSubmit}
										disabled={dictationBusy}
										onAction={agent.handleSubmit}
									/>
								</PromptInputActions>
							}
						>
							<PromptInputTextarea
								placeholder="Ask anything"
								aria-label="Message Friday"
								className="rounded-none"
							/>
						</PromptInput>
					</div>
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
