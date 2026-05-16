import type { ReactElement, RefObject } from 'react';
import type { Components } from 'react-markdown';
import { AnimatePresence, motion } from 'motion/react';
import {
	ArrowUp,
	AudioLines,
	ListChecks,
	Mic,
	Plus,
	RotateCcw,
	Square,
} from 'lucide-react';
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import { FeedbackBar } from '@/components/ui/feedback-bar';
import { Loader } from '@/components/ui/loader';
import { Message, MessageContent } from '@/components/ui/message';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { ScrollButton } from '@/components/ui/scroll-button';
import { Steps, StepsContent, StepsItem, StepsTrigger } from '@/components/ui/steps';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/prompt-kit/markdown';
import { Tool } from '@/components/prompt-kit/tool';
import { cn } from '@/lib/utils';
import {
	inputAnswerKey,
	type AssistantMessage,
	type AssistantRunState,
	type AssistantToolPart,
	type HomeChatMessage,
	type HomeMultiSelectMessage,
} from '../context';

interface HomeChatSurfaceProps {
	readonly messages: readonly HomeChatMessage[];
	readonly activeAssistantId?: string;
	readonly selectedOptions: Record<string, readonly string[]>;
	readonly pendingInputAnswers: Record<string, string>;
	readonly input: string;
	readonly isLoading: boolean;
	readonly historyLoading: boolean;
	readonly inputRef: RefObject<HTMLTextAreaElement | null>;
	readonly onInputChange: (value: string) => void;
	readonly onSubmit: () => void;
	readonly onReset: () => void;
	readonly onSelectApprovalOption: (
		messageId: string,
		approvalId: string,
		optionId: string
	) => void;
	readonly onPendingInputChange: (
		messageId: string,
		inputId: string,
		value: string
	) => void;
	readonly onSubmitPending: (message: HomeMultiSelectMessage) => void;
	readonly onUseSuggestion: (prompt: string) => void;
	readonly onVoiceModeRequest: () => void;
}

const exampleActions = [
	{
		name: 'Inspect a file',
		detail: 'explain changes',
		prompt: 'inspect src/renderer/src/pages/home/HomePage.tsx and explain what to improve',
	},
	{
		name: 'Make an edit',
		detail: 'small patch',
		prompt: 'make a focused UI improvement in the current page',
	},
	{
		name: 'Plan next step',
		detail: 'clear checklist',
		prompt: 'look at the project and tell me the next best implementation step',
	},
] as const;

const markdownComponents: Partial<Components> = {
	p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
	ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
	ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
	h1: ({ children }) => <h1 className="mb-2 text-2xl font-semibold">{children}</h1>,
	h2: ({ children }) => <h2 className="mb-2 text-xl font-semibold">{children}</h2>,
	h3: ({ children }) => <h3 className="mb-2 text-lg font-semibold">{children}</h3>,
	h4: ({ children }) => <h4 className="mb-2 text-base font-semibold">{children}</h4>,
	h5: ({ children }) => <h5 className="mb-2 text-sm font-semibold">{children}</h5>,
	h6: ({ children }) => <h6 className="mb-2 text-xs font-semibold">{children}</h6>,
};

const runStateLabels: Record<AssistantRunState, string> = {
	idle: 'Ready',
	thinking: 'Thinking',
	reasoning: 'Thinking',
	using_tools: 'Using tools',
	waiting_for_approval: 'Needs approval',
	answering: 'Answering',
	completed: 'Completed',
	cancelled: 'Cancelled',
	error: 'Error',
};

function isRunningState(state: AssistantRunState): boolean {
	return (
		state === 'thinking' ||
		state === 'reasoning' ||
		state === 'using_tools' ||
		state === 'waiting_for_approval' ||
		state === 'answering'
	);
}

function stateTone(state: AssistantRunState): string {
	if (state === 'error') return 'bg-destructive/10 text-destructive';
	if (state === 'cancelled') return 'bg-muted text-muted-foreground';
	if (state === 'completed') return 'bg-success/10 text-success';
	if (state === 'waiting_for_approval') return 'bg-warning/10 text-warning';
	return 'bg-info/10 text-info';
}

function assistantStatusLabel(message: AssistantMessage): string {
	if (message.state === 'answering' && message.tools.length === 0) {
		return 'Responding directly';
	}
	if (message.state === 'answering' && message.tools.length > 0) {
		return 'Answering with tool results';
	}
	if (message.state === 'completed' && message.tools.length === 0) {
		return 'Responded directly';
	}
	if (message.state === 'completed' && message.tools.length > 0) {
		return `Completed with ${message.tools.length} tool call${
			message.tools.length === 1 ? '' : 's'
		}`;
	}
	return runStateLabels[message.state];
}

function ReferenceConversation({
	onUseSuggestion,
}: {
	readonly onUseSuggestion: (prompt: string) => void;
}): ReactElement {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-2 pb-4 pt-5">
			<section className="flex max-w-xl flex-col gap-3" aria-label="Assistant suggestions">
				<MessageContent className="w-fit rounded-2xl px-4 py-3 text-sm font-medium leading-snug">
					A few useful starting points:
				</MessageContent>
				<div className="flex flex-col gap-2">
					{exampleActions.map((action) => (
						<PromptSuggestion
							key={action.name}
							type="button"
							variant="outline"
							size="lg"
							className="grid h-auto min-h-10 w-full grid-cols-[1fr_auto] rounded-xl px-4 py-2.5 text-left"
							onClick={() => onUseSuggestion(action.prompt)}
						>
							<span className="min-w-0 truncate text-sm font-semibold">{action.name}</span>
							<span className="text-xs font-medium text-muted-foreground">{action.detail}</span>
						</PromptSuggestion>
					))}
				</div>
			</section>
		</div>
	);
}

function UserMessage({ content }: { readonly content: string }): ReactElement {
	return (
		<Message className="justify-end">
			<MessageContent className="min-w-0 max-w-xl break-words rounded-3xl px-5 py-3 text-sm font-medium leading-relaxed [overflow-wrap:anywhere]">
				{content}
			</MessageContent>
		</Message>
	);
}

function AssistantToolActivity({
	tools,
}: {
	readonly tools: readonly AssistantToolPart[];
}): ReactElement | null {
	if (tools.length === 0) return null;
	const hasRunning = tools.some(
		(tool) => tool.state === 'input-streaming' || tool.state === 'input-available'
	);
	const hasError = tools.some((tool) => tool.state === 'output-error');

	return (
		<Steps defaultOpen>
			<StepsTrigger leftIcon={<ListChecks className="size-3.5" />}>
				{hasRunning || hasError
					? 'Tool calls and responses'
					: `${tools.length} tool response${tools.length === 1 ? '' : 's'}`}
			</StepsTrigger>
			<StepsContent>
				{tools.map((tool) => (
					<StepsItem key={tool.toolCallId}>
						<span
							className={cn(
								'mt-3 size-2 shrink-0 rounded-full',
								tool.state === 'output-error'
									? 'bg-destructive'
									: tool.state === 'output-available'
										? 'bg-success'
										: 'bg-info'
							)}
							aria-hidden
						/>
						<Tool toolPart={tool} defaultOpen className="min-w-0 flex-1" />
					</StepsItem>
				))}
			</StepsContent>
		</Steps>
	);
}

function AssistantActivityPanel({
	message,
	isStreaming,
}: {
	readonly message: AssistantMessage;
	readonly isStreaming: boolean;
}): ReactElement | null {
	const showActivity =
		message.state !== 'idle' ||
		message.tools.length > 0 ||
		Boolean(message.errorText);
	if (!showActivity) return null;
	const statusLabel = assistantStatusLabel(message);

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-center gap-2">
				<span
					className={cn(
						'inline-flex min-h-6 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
						stateTone(message.state)
					)}
				>
					{isStreaming && isRunningState(message.state) ? (
						<Loader variant="typing" size="sm" />
					) : (
						<span className="size-1.5 rounded-full bg-current" aria-hidden />
					)}
					{statusLabel}
				</span>
				{message.runId && (
					<span className="truncate font-mono text-[11px] text-muted-foreground">
						{message.runId}
					</span>
				)}
			</div>
			<AssistantToolActivity tools={message.tools} />
			{message.errorText && (
				<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
					{message.errorText}
				</p>
			)}
		</div>
	);
}

function AssistantTextMessage({
	message,
	isStreaming = false,
}: {
	readonly message: AssistantMessage;
	readonly isStreaming?: boolean;
}): ReactElement {
	return (
		<Message className="min-w-0 max-w-2xl">
			<div className="flex min-w-0 flex-1 items-start gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<AssistantActivityPanel message={message} isStreaming={isStreaming} />
					{message.content.length > 0 && (
						<Markdown
							components={markdownComponents}
							className="prose min-w-0 max-w-full break-words rounded-2xl bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm [overflow-wrap:anywhere] prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs dark:prose-invert [&_*]:max-w-full [&_a]:break-words [&_a]:[overflow-wrap:anywhere] [&_code]:break-words"
						>
							{message.content}
						</Markdown>
					)}
					{message.content.length > 0 && (
						<FeedbackBar className="max-w-xl bg-background/80 px-0 text-xs shadow-sm" />
					)}
				</div>
			</div>
		</Message>
	);
}

function PendingMessage({
	message,
	selectedOptions,
	inputAnswers,
	onInputAnswerChange,
	onSelectApprovalOption,
	onSubmit,
}: {
	readonly message: HomeMultiSelectMessage;
	readonly selectedOptions: readonly string[];
	readonly inputAnswers: Record<string, string>;
	readonly onInputAnswerChange: (messageId: string, inputId: string, value: string) => void;
	readonly onSelectApprovalOption: (
		messageId: string,
		approvalId: string,
		optionId: string
	) => void;
	readonly onSubmit: (message: HomeMultiSelectMessage) => void;
}): ReactElement {
	const approvalOptions = message.options.filter((option) => option.kind === 'approval');
	const inputOptions = message.options.filter((option) => option.kind === 'input');
	const hasMissingInput = inputOptions.some(
		(option) =>
			option.inputId &&
			(inputAnswers[inputAnswerKey(message.id, option.inputId)] ?? '').trim().length === 0
	);

	return (
		<Message className="max-w-2xl">
			<MessageContent
				className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl p-4 shadow-sm"
				role="group"
				aria-label={message.prompt}
			>
				<p className="text-sm font-semibold text-foreground">{message.prompt}</p>
				{approvalOptions.length > 0 && (
					<div className="flex flex-col gap-2" role="radiogroup">
						{approvalOptions.map((option) => {
							const isSelected = selectedOptions.includes(option.id);
							const handleChange = (): void => {
								if (option.approvalId) {
									onSelectApprovalOption(message.id, option.approvalId, option.id);
								}
							};

							return (
								<Button
									key={option.id}
									type="button"
									variant={isSelected ? 'secondary' : 'outline'}
									size="lg"
									role="radio"
									aria-checked={isSelected}
									onClick={handleChange}
									className="h-auto w-full justify-start gap-3 whitespace-normal rounded-xl px-3 py-3 text-left"
								>
									<span
										className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-current"
										aria-hidden
									>
										{isSelected && <span className="size-1.5 rounded-full bg-current" />}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-semibold leading-snug">{option.label}</span>
										<span className="mt-1 block break-words text-xs leading-normal text-muted-foreground">
											{option.description}
										</span>
									</span>
								</Button>
							);
						})}
					</div>
				)}
				{inputOptions.map((option) => {
					if (!option.inputId) return null;
					const key = inputAnswerKey(message.id, option.inputId);
					return (
						<label key={option.id} className="flex flex-col gap-2">
							<span className="text-sm font-semibold leading-snug">{option.label}</span>
							<span className="whitespace-pre-wrap text-xs leading-normal text-muted-foreground">
								{option.description}
							</span>
							<Textarea
								value={inputAnswers[key] ?? ''}
								onChange={(event) =>
									onInputAnswerChange(message.id, option.inputId!, event.currentTarget.value)
								}
								className="min-h-20 resize-none rounded-xl"
							/>
						</label>
					);
				})}
				<Button
					type="button"
					size="sm"
					className="self-start rounded-xl"
					disabled={hasMissingInput}
					onClick={() => onSubmit(message)}
				>
					Confirm
				</Button>
			</MessageContent>
		</Message>
	);
}

type ComposerProps = {
	readonly value: string;
	readonly isLoading: boolean;
	readonly canReset: boolean;
	readonly inputRef: RefObject<HTMLTextAreaElement | null>;
	readonly onValueChange: (value: string) => void;
	readonly onSubmit: () => void;
	readonly onReset: () => void;
	readonly onVoiceModeRequest: () => void;
};

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

function VoiceButton({ onVoiceModeRequest }: { readonly onVoiceModeRequest: () => void }): ReactElement {
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

function Composer({
	value,
	isLoading,
	canReset,
	inputRef,
	onValueChange,
	onSubmit,
	onReset,
	onVoiceModeRequest,
}: ComposerProps): ReactElement {
	const canSubmit = value.trim().length > 0;
	const handlePrimaryAction = (): void => {
		if (isLoading || canSubmit) {
			onSubmit();
			return;
		}
		onVoiceModeRequest();
	};

	return (
		<div className="flex shrink-0 justify-center bg-gradient-to-t from-background via-background/95 to-transparent px-5 pb-4 pt-4">
			<PromptInput
				value={value}
				onValueChange={onValueChange}
				isLoading={isLoading}
				maxHeight={360}
				onSubmit={onSubmit}
				textareaRef={inputRef}
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
									<ResetButton onReset={onReset} />
								</motion.div>
							)}
						</AnimatePresence>
						<VoiceButton onVoiceModeRequest={onVoiceModeRequest} />
						<SubmitButton isLoading={isLoading} canSubmit={canSubmit} onAction={handlePrimaryAction} />
					</PromptInputActions>
				}
			>
				<PromptInputTextarea placeholder="Ask anything" aria-label="Message Friday" />
			</PromptInput>
		</div>
	);
}

export function HomeChatSurface({
	messages,
	activeAssistantId,
	selectedOptions,
	pendingInputAnswers,
	input,
	isLoading,
	historyLoading,
	inputRef,
	onInputChange,
	onSubmit,
	onReset,
	onSelectApprovalOption,
	onPendingInputChange,
	onSubmitPending,
	onUseSuggestion,
	onVoiceModeRequest,
}: HomeChatSurfaceProps): ReactElement {
	const showReferenceConversation = messages.length <= 1 && !isLoading && !historyLoading;
	const canReset = messages.length > 1 || isLoading;

	return (
		<div className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground">
			<ChatContainerRoot className="min-h-0 p-0 [scrollbar-gutter:auto]" aria-live="polite">
				<ChatContainerContent
					className={cn(
						'mx-auto min-h-full w-full max-w-4xl gap-5 px-6',
						showReferenceConversation ? 'justify-start pb-6 pt-7' : 'pb-8 pt-6'
					)}
				>
					{showReferenceConversation ? (
						<ReferenceConversation onUseSuggestion={onUseSuggestion} />
					) : (
						<>
							{messages.map((message) => {
								if (message.role === 'user') {
									return <UserMessage key={message.id} content={message.content} />;
								}

								if (message.type === 'multi-select') {
									return (
										<PendingMessage
											key={message.id}
											message={message}
											selectedOptions={selectedOptions[message.id] ?? []}
											inputAnswers={pendingInputAnswers}
											onInputAnswerChange={onPendingInputChange}
											onSelectApprovalOption={onSelectApprovalOption}
											onSubmit={onSubmitPending}
										/>
									);
								}

								return (
									<AssistantTextMessage
										key={message.id}
										message={message}
										isStreaming={isLoading && message.id === activeAssistantId}
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
			<Composer
				value={input}
				isLoading={isLoading}
				canReset={canReset}
				inputRef={inputRef}
				onValueChange={onInputChange}
				onSubmit={onSubmit}
				onReset={onReset}
				onVoiceModeRequest={onVoiceModeRequest}
			/>
		</div>
	);
}
