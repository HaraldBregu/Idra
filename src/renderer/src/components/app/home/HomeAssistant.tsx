import {
	useEffect,
	useRef,
	type ReactElement,
	type RefObject,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { ArrowUp, Calendar, Copy, Mic, Play, Square } from 'lucide-react';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ApprovalDecision } from '@shared/service';

export interface HomeTextMessage {
	readonly id: string;
	readonly role: 'user' | 'assistant';
	readonly type: 'text';
	readonly content: string;
}

export interface HomeMultiSelectOption {
	readonly id: string;
	readonly kind: 'approval' | 'input';
	readonly label: string;
	readonly description: string;
	readonly approvalId?: string;
	readonly decision?: ApprovalDecision;
	readonly inputId?: string;
}

export interface HomeMultiSelectMessage {
	readonly id: string;
	readonly role: 'assistant';
	readonly type: 'multi-select';
	readonly prompt: string;
	readonly options: readonly HomeMultiSelectOption[];
}

export type HomeChatMessage = HomeTextMessage | HomeMultiSelectMessage;

interface HomeChatViewProps {
	readonly messages: readonly HomeChatMessage[];
	readonly selectedOptions: Record<string, readonly string[]>;
	readonly input: string;
	readonly isLoading: boolean;
	readonly historyLoading: boolean;
	readonly streamText: string;
	readonly streamStarted: boolean;
	readonly inputRef: RefObject<HTMLTextAreaElement | null>;
	readonly onInputChange: (value: string) => void;
	readonly onSubmit: () => void;
	readonly onCopyMessage: (content: string) => void;
	readonly onToggleOption: (messageId: string, optionId: string) => void;
	readonly onSelectApprovalOption: (
		messageId: string,
		approvalId: string,
		optionId: string
	) => void;
	readonly onSubmitPending: (message: HomeMultiSelectMessage) => void;
	readonly onVoiceModeRequest: () => void;
}

interface HomeVoiceViewProps {
	readonly onSwitchToTyping: () => void;
}

const markdownComponents: Partial<Components> = {
	p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
	ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
	ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
	code: ({ children, className }) => (
		<code className={cn('rounded bg-muted px-1 py-0.5 font-mono text-xs', className)}>
			{children}
		</code>
	),
	pre: ({ children }) => (
		<pre className="mb-2 overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 text-xs last:mb-0">
			{children}
		</pre>
	),
};

const exampleActions = [
	{ name: 'Inspect a file', detail: 'explain changes' },
	{ name: 'Make an edit', detail: 'small patch' },
	{ name: 'Plan next step', detail: 'clear checklist' },
] as const;

const waveformBars = [14, 22, 17, 24, 16, 28, 20, 12, 26, 18, 23, 15, 25, 13] as const;

function AssistantLabel(): ReactElement {
	return (
		<div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
			<span className="text-xl leading-none text-primary" aria-hidden>
				*
			</span>
			<span>Friday</span>
		</div>
	);
}

function MarkdownContent({ content }: { readonly content: string }): ReactElement {
	return (
		<div className="text-sm leading-relaxed text-foreground">
			<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
				{content}
			</ReactMarkdown>
		</div>
	);
}

function TooltipIconButton({
	label,
	children,
	className,
	onClick,
}: {
	readonly label: string;
	readonly children: ReactElement;
	readonly className?: string;
	readonly onClick?: () => void;
}): ReactElement {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className={className}
							aria-label={label}
							onClick={onClick}
						>
							{children}
						</Button>
					}
				/>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function AudioPreview(): ReactElement {
	return (
		<div className="ml-auto flex w-full max-w-lg flex-col items-start gap-2">
			<div className="flex h-10 w-full items-center gap-4 rounded-full bg-muted px-3 shadow-sm">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
					<Play className="ml-0.5 size-3 fill-current" />
				</span>
				<div className="flex flex-1 items-center gap-1" aria-hidden>
					{waveformBars.map((height, index) => (
						<span
							key={`${height}-${index}`}
							className="w-1 rounded-full bg-muted-foreground"
							style={{ height }}
						/>
					))}
				</div>
				<span className="font-mono text-xs font-semibold text-muted-foreground">0:06</span>
			</div>
			<p className="px-1 text-sm font-medium italic leading-snug text-muted-foreground">
				&quot;check the project and tell me what to fix first&quot;
			</p>
		</div>
	);
}

function ReferenceConversation(): ReactElement {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-3 pb-4 pt-6">
			<AudioPreview />
			<section className="flex max-w-xl flex-col gap-4" aria-label="Assistant suggestions">
				<AssistantLabel />
				<p className="text-base font-medium leading-tight text-foreground">
					A few useful starting points:
				</p>
				<div className="flex flex-col gap-3">
					{exampleActions.map((action) => (
						<div
							key={action.name}
							className="grid min-h-10 grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-border bg-card px-4 text-base shadow-sm"
						>
							<div className="flex min-w-0 items-center gap-4">
								<span className="size-1.5 rounded-full bg-primary" aria-hidden />
								<span className="truncate font-semibold text-foreground">{action.name}</span>
							</div>
							<span className="text-sm font-semibold text-muted-foreground">{action.detail}</span>
						</div>
					))}
				</div>
			</section>
			<section
				className="ml-auto flex w-full max-w-md flex-col gap-2"
				aria-label="User selection"
			>
				<div className="border-l-4 border-primary bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
					Make an edit · small patch
				</div>
				<div className="rounded-3xl bg-muted px-5 py-3 text-base font-medium leading-tight text-foreground">
					clean up the home layout
				</div>
			</section>
			<section className="flex max-w-lg flex-col gap-3" aria-label="Assistant confirmation">
				<AssistantLabel />
				<div className="rounded-2xl bg-card p-5 shadow-sm">
					<div className="flex gap-4">
						<div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
							<Calendar className="size-5" />
						</div>
						<div className="min-w-0 flex-1">
							<h2 className="truncate text-base font-bold leading-tight text-foreground">
								Ready to update the homepage
							</h2>
							<p className="mt-1 text-sm font-medium text-muted-foreground">
								Small UI pass · theme colors · focused diff
							</p>
						</div>
					</div>
					<div className="mt-5 flex flex-wrap gap-3">
						<Button
							type="button"
							className="h-9 rounded-xl px-4 text-sm font-bold"
						>
							Apply change
						</Button>
						<Button
							type="button"
							variant="outline"
							className="h-9 rounded-xl px-4 text-sm font-medium"
						>
							Adjust scope
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}

function UserMessage({ content }: { readonly content: string }): ReactElement {
	return (
		<div className="flex justify-end">
			<div className="max-w-xl rounded-3xl bg-muted px-5 py-3 text-base font-medium leading-relaxed text-foreground">
				{content}
			</div>
		</div>
	);
}

function AssistantTextMessage({
	content,
	onCopy,
}: {
	readonly content: string;
	readonly onCopy: () => void;
}): ReactElement {
	return (
		<div className="flex max-w-2xl flex-col gap-2">
			<AssistantLabel />
			<div className="group/message flex items-start gap-2">
				<div className="rounded-2xl bg-card/80 px-4 py-3 shadow-sm">
					<MarkdownContent content={content} />
				</div>
				<TooltipIconButton
					label="Copy message"
					className="mt-1 size-8 rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/message:opacity-100 focus-visible:opacity-100"
					onClick={onCopy}
				>
					<Copy className="size-4" />
				</TooltipIconButton>
			</div>
		</div>
	);
}

function PendingMessage({
	message,
	selectedOptions,
	onToggleOption,
	onSelectApprovalOption,
	onSubmit,
}: {
	readonly message: HomeMultiSelectMessage;
	readonly selectedOptions: readonly string[];
	readonly onToggleOption: (messageId: string, optionId: string) => void;
	readonly onSelectApprovalOption: (
		messageId: string,
		approvalId: string,
		optionId: string
	) => void;
	readonly onSubmit: (message: HomeMultiSelectMessage) => void;
}): ReactElement {
	return (
		<div className="flex max-w-2xl flex-col gap-3">
			<AssistantLabel />
			<div
				className="flex flex-col gap-3 rounded-2xl border border-border bg-card/80 p-4 shadow-sm"
				role="group"
				aria-label={message.prompt}
			>
				<p className="text-sm font-semibold text-foreground">{message.prompt}</p>
				<div
					className="flex flex-col gap-2"
					role={
						message.options.some((option) => option.kind === 'approval') ? 'radiogroup' : 'group'
					}
				>
					{message.options.map((option) => {
						const isSelected = selectedOptions.includes(option.id);
						const handleChange = (): void => {
							if (option.kind === 'approval' && option.approvalId) {
								onSelectApprovalOption(message.id, option.approvalId, option.id);
								return;
							}
							onToggleOption(message.id, option.id);
						};

						return (
							<button
								key={option.id}
								type="button"
								role={option.kind === 'approval' ? 'radio' : 'checkbox'}
								aria-checked={isSelected}
								onClick={handleChange}
								className={cn(
									'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
									isSelected
										? 'border-ring bg-accent text-accent-foreground'
										: 'border-border bg-card hover:bg-muted'
								)}
							>
								<span
									className={cn(
										'mt-0.5 flex size-4 shrink-0 items-center justify-center border',
										option.kind === 'approval' ? 'rounded-full' : 'rounded-sm',
										isSelected ? 'border-primary bg-primary' : 'border-border'
									)}
									aria-hidden
								>
									{isSelected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-sm font-semibold leading-snug">{option.label}</span>
									<span className="mt-1 block break-words text-xs leading-normal text-muted-foreground">
										{option.description}
									</span>
								</span>
							</button>
						);
					})}
				</div>
				<Button
					type="button"
					className="self-start rounded-xl"
					onClick={() => onSubmit(message)}
				>
					Confirm
				</Button>
			</div>
		</div>
	);
}

function TypingIndicator(): ReactElement {
	return (
		<div className="flex max-w-2xl flex-col gap-2">
			<AssistantLabel />
			<div className="flex items-center gap-3 text-muted-foreground">
				<div className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-4 py-3">
					<span className="size-2 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
					<span className="size-2 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
					<span className="size-2 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
				</div>
				<span className="text-sm font-medium">Thinking</span>
			</div>
		</div>
	);
}

function Composer({
	value,
	isLoading,
	inputRef,
	onValueChange,
	onSubmit,
	onVoiceModeRequest,
}: {
	readonly value: string;
	readonly isLoading: boolean;
	readonly inputRef: RefObject<HTMLTextAreaElement | null>;
	readonly onValueChange: (value: string) => void;
	readonly onSubmit: () => void;
	readonly onVoiceModeRequest: () => void;
}): ReactElement {
	return (
		<div className="shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent px-5 pb-5 pt-8">
			<PromptInput
				value={value}
				onValueChange={onValueChange}
				onSubmit={onSubmit}
				isLoading={isLoading}
				maxHeight={160}
				textareaRef={inputRef}
				className="mx-auto flex min-h-14 w-full max-w-3xl items-center gap-3 rounded-2xl border-border bg-card px-4 py-3 shadow-lg shadow-foreground/5 focus-within:ring-2 focus-within:ring-ring/20"
			>
				<span className="shrink-0 text-xl leading-none text-muted-foreground" aria-hidden>
					*
				</span>
				<PromptInputTextarea
					placeholder="ask Friday to inspect, change, or explain something"
					rows={1}
					wrap="off"
					className="max-h-32 min-h-7 flex-1 resize-none overflow-x-auto whitespace-nowrap border-0 bg-transparent px-0 py-1 text-sm leading-snug text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:!outline-none focus-visible:border-transparent focus-visible:ring-0 md:text-sm"
					aria-label="Message Friday"
				/>
				<PromptInputActions className="shrink-0 gap-3">
					<PromptInputAction tooltip="Switch to voice">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="size-9 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							aria-label="Switch to voice"
							onClick={onVoiceModeRequest}
						>
							<Mic className="size-4" />
						</Button>
					</PromptInputAction>
					<PromptInputAction tooltip={isLoading ? 'Stop response' : 'Send message'}>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="size-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
							aria-label={isLoading ? 'Stop response' : 'Send message'}
							onClick={onSubmit}
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
	);
}

export function HomeChatView({
	messages,
	selectedOptions,
	input,
	isLoading,
	historyLoading,
	streamText,
	streamStarted,
	inputRef,
	onInputChange,
	onSubmit,
	onCopyMessage,
	onToggleOption,
	onSelectApprovalOption,
	onSubmitPending,
	onVoiceModeRequest,
}: HomeChatViewProps): ReactElement {
	const showReferenceConversation = messages.length <= 1 && !isLoading && !historyLoading;
	const scrollAnchorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		scrollAnchorRef.current?.scrollIntoView({ block: 'end' });
	}, [isLoading, messages, showReferenceConversation, streamText]);

	return (
		<div className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground">
			<div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto">
				<div
					className={cn(
						'mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 px-6',
						showReferenceConversation ? 'justify-start pb-6 pt-7' : 'pb-8 pt-6'
					)}
					role="log"
					aria-live="polite"
				>
					{showReferenceConversation ? (
						<ReferenceConversation />
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
											onToggleOption={onToggleOption}
											onSelectApprovalOption={onSelectApprovalOption}
											onSubmit={onSubmitPending}
										/>
									);
								}

								return (
									<AssistantTextMessage
										key={message.id}
										content={message.content}
										onCopy={() => onCopyMessage(message.content)}
									/>
								);
							})}
							{isLoading && streamStarted && streamText.length > 0 && (
								<AssistantTextMessage
									content={streamText}
									onCopy={() => onCopyMessage(streamText)}
								/>
							)}
							{isLoading && !streamStarted && <TypingIndicator />}
						</>
					)}
					<div ref={scrollAnchorRef} className="h-px w-full shrink-0" aria-hidden />
				</div>
			</div>
			<Composer
				value={input}
				isLoading={isLoading}
				inputRef={inputRef}
				onValueChange={onInputChange}
				onSubmit={onSubmit}
				onVoiceModeRequest={onVoiceModeRequest}
			/>
		</div>
	);
}

function VoiceKbd({ children }: { readonly children: string }): ReactElement {
	return (
		<kbd className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-sm">
			{children}
		</kbd>
	);
}

export function HomeVoiceView({ onSwitchToTyping }: HomeVoiceViewProps): ReactElement {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
			<div className="flex flex-1 flex-col items-center px-8 pt-8 text-center">
				<div className="space-y-4">
					<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ready</p>
					<h1 className="text-base font-semibold tracking-tight text-muted-foreground">
						Hold the mic, or press and hold ⌘ space
					</h1>
				</div>
				<div className="flex flex-1 items-center">
					<button
						type="button"
						className="flex size-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg shadow-foreground/5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
						aria-label="Hold to speak"
					>
						<Mic className="size-5" strokeWidth={1.8} />
					</button>
				</div>
				<div className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground">
					<span className="flex items-center gap-3">
						<VoiceKbd>hold ⌘</VoiceKbd> keep speaking
					</span>
					<span className="flex items-center gap-3">
						<VoiceKbd>release</VoiceKbd> send
					</span>
					<span className="flex items-center gap-3">
						<VoiceKbd>esc</VoiceKbd> cancel
					</span>
				</div>
			</div>
			<div className="border-t border-border px-6 py-4">
				<div className="flex min-h-10 items-center justify-between gap-4 rounded-full border border-border bg-card px-5 text-xs font-semibold text-muted-foreground">
					<div className="flex items-center gap-3">
						<span className="size-3 rounded-full bg-muted-foreground" aria-hidden />
						<span>Voice mode</span>
					</div>
					<button
						type="button"
						onClick={onSwitchToTyping}
						className="flex items-center gap-3 rounded-full px-2 py-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<span>switch to typing</span>
						<span className="rounded-md bg-muted px-2 py-0.5 font-mono text-sm font-bold text-foreground">
							⌘ /
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
