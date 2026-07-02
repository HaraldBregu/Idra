import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowUp, AudioLines, FileAudio, Mic, Paperclip, Plus, Square, Volume2, X } from 'lucide-react';
import { PageContainer } from '@/components/app/base/page';
import { Button } from '@/components/ui/button';
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { GradientSphere } from '@/components/ui/gradient-sphere';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
	usePromptInput,
	type PromptInputVoiceMode,
} from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { ScrollButton } from '@/components/ui/scroll-button';
import { useChatMode } from '@/contexts/chat-mode';
import { cn } from '@/lib/utils';
import { AssistantMessage } from './components/AssistantMessage';
import { UserMessage } from './components/UserMessage';
import { Provider, welcomeMessage } from './context';
import {
	useAudioRecorder,
	useHomeAgent,
	useRealtimeDictation,
	useVoiceButtonMode,
	type VoiceButtonMode,
} from './hooks';
import { appendTranscriptionText, fileToSttAudioInput } from './hooks/stt';

type PromptAttachment = {
	readonly id: string;
	readonly kind: 'file' | 'audio';
	readonly file: File;
	readonly url?: string;
	readonly durationMs?: number;
};

const promptSuggestions = [
	{
		label: 'Introduce yourself',
		prompt:
			'Introduce yourself as Friday, my personal assistant. Keep it brief and specific: explain what you can help me do, how I should ask for help, and suggest three useful first tasks.',
	},
	{
		label: 'Say hi',
		prompt:
			'Say hi and start a short onboarding conversation. Ask what I am working on today, then offer a few practical ways you can help me right now.',
	},
	{
		label: 'Meet your assistant',
		prompt:
			'Give me a quick tour of Friday as my personal assistant. Summarize your main capabilities, explain the best way to work with you, and propose three starter prompts I can try.',
	},
	{
		label: 'Plan my day',
		prompt:
			'Help me plan today. Ask for my priorities, time constraints, and any deadlines, then turn them into a practical schedule.',
	},
	{
		label: 'Draft a message',
		prompt:
			'Help me draft a clear message. Ask who it is for, what I need to say, and the tone I want.',
	},
	{
		label: 'Brainstorm ideas',
		prompt:
			'Brainstorm ten practical ideas for something I can improve this week, then help me choose one small next action.',
	},
] as const;

function attachmentId(): string {
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	return `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDuration(durationMs: number): string {
	const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatFileSize(size: number): string {
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
	return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function filesToAttachments(files: File[]): PromptAttachment[] {
	return files.map((file) => ({
		id: attachmentId(),
		kind: 'file',
		file,
	}));
}

function RecorderErrorMessage({
	message,
}: {
	readonly message: string | null;
}): ReactElement | null {
	if (!message) return null;

	return (
		<div className="mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive shadow-sm">
			<AlertCircle className="size-4 shrink-0" />
			<p className="min-w-0 truncate text-xs font-medium">{message}</p>
		</div>
	);
}

function EmptyConversation(): ReactElement {
	return (
		<Empty className="mx-auto max-w-sm border-0 p-0">
			<EmptyHeader>
				<EmptyMedia className="mt-8">
					<GradientSphere size={72} />
				</EmptyMedia>
				<EmptyTitle>Start a conversation</EmptyTitle>
				<EmptyDescription>
					Ask Friday to inspect code, make a change, or help plan the next step.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function PromptSuggestions({
	onUseSuggestion,
}: {
	readonly onUseSuggestion: (prompt: string) => void;
}): ReactElement {
	return (
		<div className="mb-2 flex flex-wrap justify-center gap-2 px-1" aria-label="Prompt suggestions">
			{promptSuggestions.map((suggestion) => (
				<PromptSuggestion
					key={suggestion.label}
					type="button"
					variant="outline"
					size="sm"
					className="h-8 max-w-full border-border/70 bg-card/95 px-3 text-xs font-medium text-muted-foreground shadow-sm shadow-foreground/5 hover:text-foreground"
					aria-label={suggestion.prompt}
					onClick={() => onUseSuggestion(suggestion.prompt)}
				>
					{suggestion.label}
				</PromptSuggestion>
			))}
		</div>
	);
}

function AttachmentTray({
	attachments,
	onRemove,
}: {
	readonly attachments: readonly PromptAttachment[];
	readonly onRemove: (id: string) => void;
}): ReactElement | null {
	if (attachments.length === 0) return null;

	return (
		<div className="mb-2 flex max-h-32 w-full flex-col gap-1.5 overflow-y-auto rounded-lg border border-border/60 bg-card/95 p-2 shadow-sm shadow-foreground/5">
			{attachments.map((attachment) => {
				const isAudio = attachment.kind === 'audio';
				const title = isAudio
					? `Audio ${formatDuration(attachment.durationMs ?? 0)}`
					: attachment.file.name;

				return (
					<div
						key={attachment.id}
						className="flex min-w-0 items-center gap-2 rounded-md border border-border/50 bg-background/70 px-2 py-1.5"
					>
						<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
							{isAudio ? <FileAudio className="size-4" /> : <Paperclip className="size-4" />}
						</span>
						<div className="min-w-0 flex-1">
							<p className="truncate text-xs font-medium leading-4">{title}</p>
							<p className="truncate text-[11px] leading-4 text-muted-foreground">
								{attachment.file.name} - {formatFileSize(attachment.file.size)}
							</p>
						</div>
						{isAudio && attachment.url ? (
							<audio
								controls
								src={attachment.url}
								className="h-7 w-32 shrink-0 sm:w-40"
							/>
						) : null}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
							aria-label={`Remove ${title}`}
							onClick={() => onRemove(attachment.id)}
						>
							<X className="size-3.5" />
						</Button>
					</div>
				);
			})}
		</div>
	);
}

function AttachmentButton({ disabled }: { readonly disabled?: boolean }): ReactElement {
	const { triggerFileUpload } = usePromptInput();
	return (
		<PromptInputAction tooltip="Add attachment">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Add attachment"
				disabled={disabled}
				onClick={triggerFileUpload}
			>
				<Plus className="size-4" />
			</Button>
		</PromptInputAction>
	);
}

function VoiceButton({
	onVoiceModeRequest,
	disabled,
	mode,
}: {
	readonly onVoiceModeRequest: () => void;
	readonly disabled?: boolean;
	readonly mode: VoiceButtonMode;
}): ReactElement {
	const label = mode === 'record' ? 'Record voice' : 'Dictate';
	const tooltip = mode === 'disabled' ? 'Configure speech to text' : label;

	return (
		<PromptInputAction tooltip={tooltip}>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full text-foreground hover:bg-muted"
				aria-label={tooltip}
				disabled={disabled || mode === 'disabled'}
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
	disabled,
	onAction,
}: {
	readonly isLoading: boolean;
	readonly canSubmit: boolean;
	readonly disabled?: boolean;
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
				disabled={disabled}
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
	const dictation = useRealtimeDictation({
		value: agent.input,
		onValueChange: agent.setInput,
	});
	const recorder = useAudioRecorder();
	const voiceButtonMode = useVoiceButtonMode();
	const [voiceMode, setVoiceMode] = useState<PromptInputVoiceMode | null>(null);
	const [activeDictationMode, setActiveDictationMode] = useState<VoiceButtonMode | null>(null);
	const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
	const [transcriptionErrorMessage, setTranscriptionErrorMessage] = useState<string | null>(null);
	const [transcribingRecording, setTranscribingRecording] = useState(false);
	const transcriptionRunRef = useRef(0);
	const visibleMessages = agent.chatState.messages.filter(
		(message) => message.id !== welcomeMessage.id
	);
	const showEmptyConversation =
		visibleMessages.length === 0 &&
		!agent.isLoading &&
		!agent.historyLoading;
	const showPromptSuggestions = showEmptyConversation && voiceMode === null;
	const canSubmit = agent.input.trim().length > 0;
	const dictationStatus = dictation.status;
	const cancelDictationSession = dictation.cancel;
	const recorderStatus = recorder.status;
	const cancelRecordingSession = recorder.cancel;
	const dictationBusy =
		dictationStatus === 'checking-permission' ||
		dictationStatus === 'connecting' ||
		dictationStatus === 'finishing';
	const recordingBusy =
		recorderStatus === 'checking-permission' ||
		recorderStatus === 'stopping' ||
		transcribingRecording;
	const voiceBusy = dictationBusy || recordingBusy;
	const attachmentDisabled = voiceMode !== null || voiceBusy;
	const activeVoiceElapsedMs =
		activeDictationMode === 'record' ? recorder.elapsedMs : dictation.elapsedMs;
	const activeVoiceMuted =
		activeDictationMode === 'record' ? recorder.isMuted : dictation.isMuted;
	const activeVoiceStream =
		activeDictationMode === 'record' ? recorder.stream : dictation.stream;
	const activeVoiceSetMuted =
		activeDictationMode === 'record' ? recorder.setMuted : dictation.setMuted;
	const voiceErrorMessage =
		transcriptionErrorMessage ?? recorder.errorMessage ?? dictation.errorMessage;

	useEffect(() => {
		if (mode !== 'chat') return;
		setVoiceMode(null);
		setActiveDictationMode(null);
		if (
			dictationStatus === 'checking-permission' ||
			dictationStatus === 'connecting' ||
			dictationStatus === 'recording'
		) {
			void cancelDictationSession();
		}
		if (
			recorderStatus === 'checking-permission' ||
			recorderStatus === 'recording' ||
			recorderStatus === 'stopping'
		) {
			void cancelRecordingSession();
		}
	}, [cancelDictationSession, cancelRecordingSession, dictationStatus, mode, recorderStatus]);

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
		setActiveDictationMode(null);
		setVoiceMode(null);
		setMode('chat');
	};

	const startVoiceConversation = (): void => {
		setVoiceMode('conversation');
		setMode('voice');
	};

	const startDictation = async (): Promise<void> => {
		setTranscriptionErrorMessage(null);
		if (voiceButtonMode === 'disabled') {
			setTranscriptionErrorMessage('Choose a speech-to-text provider and model in Settings.');
			return;
		}
		if (voiceButtonMode === 'record') {
			const started = await recorder.start();
			if (!started) {
				setMode('chat');
				return;
			}
			setActiveDictationMode('record');
			setVoiceMode('dictation');
			setMode('voice');
			return;
		}

		const started = await dictation.start();
		if (!started) {
			setMode('chat');
			return;
		}
		setActiveDictationMode('dictate');
		setVoiceMode('dictation');
		setMode('voice');
	};

	const cancelDictation = async (): Promise<void> => {
		transcriptionRunRef.current += 1;
		setTranscribingRecording(false);
		if (activeDictationMode === 'record') {
			await recorder.cancel();
		} else {
			await dictation.cancel();
		}
		returnToChat();
	};

	const confirmDictation = async (): Promise<void> => {
		if (activeDictationMode === 'record') {
			const runId = transcriptionRunRef.current + 1;
			transcriptionRunRef.current = runId;
			setTranscribingRecording(true);
			setTranscriptionErrorMessage(null);

			try {
				const recording = await recorder.stop();
				if (!recording) {
					returnToChat();
					return;
				}

				try {
					const result = await window.voice.transcribe({
						audio: await fileToSttAudioInput(recording.file),
					});
					if (transcriptionRunRef.current === runId) {
						agent.setInput(appendTranscriptionText(agent.input, result.text));
					}
				} finally {
					if (recording.url) URL.revokeObjectURL(recording.url);
				}
			} catch (error) {
				const message =
					error instanceof Error && error.message.trim()
						? error.message
						: 'Speech transcription failed.';
				if (transcriptionRunRef.current === runId) setTranscriptionErrorMessage(message);
			} finally {
				if (transcriptionRunRef.current === runId) {
					setTranscribingRecording(false);
					returnToChat();
				}
			}
			return;
		}

		await dictation.finish();
		returnToChat();
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
							'mx-auto w-full max-w-4xl gap-5 px-4',
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
										<AssistantMessage
											key={message.id}
											message={message}
											isStreaming={
												agent.isLoading &&
												message.id === agent.chatState.activeAgentId
											}
											showHeader={showAssistantHeader}
											collapseLongContent={isPreviousMessage}
											className={groupedAssistantClassName}
											onReply={agent.switchToTyping}
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
						<RecorderErrorMessage message={voiceErrorMessage} />
						<AttachmentTray attachments={attachments} onRemove={removeAttachment} />
						<PromptInput
							value={agent.input}
							onValueChange={agent.setInput}
							isLoading={agent.isLoading}
							maxHeight={360}
							onSubmit={agent.handleSubmit}
							textareaRef={agent.inputRef}
							leadingAction={<AttachmentButton disabled={attachmentDisabled} />}
							voiceMode={voiceMode}
							voiceElapsedMs={voiceMode === 'dictation' ? activeVoiceElapsedMs : undefined}
							voiceMuted={voiceMode === 'dictation' ? activeVoiceMuted : undefined}
							voiceMediaStream={voiceMode === 'dictation' ? activeVoiceStream : null}
							onVoiceMutedChange={voiceMode === 'dictation' ? activeVoiceSetMuted : undefined}
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
									{!canSubmit && (
										<VoiceButton
											onVoiceModeRequest={() => void startDictation()}
											disabled={voiceBusy || agent.isLoading}
											mode={voiceButtonMode}
										/>
									)}
									<SubmitButton
										isLoading={agent.isLoading}
										canSubmit={canSubmit}
										disabled={voiceBusy}
										onAction={handlePrimaryAction}
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
