import {
	useEffect,
	useRef,
	type ChangeEvent,
	type KeyboardEvent,
	type ReactElement,
	type RefObject,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { ArrowUp, Calendar, Copy, Mic, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
		<code className={cn('rounded bg-black/5 px-1 py-0.5 font-mono text-[0.85em]', className)}>
			{children}
		</code>
	),
	pre: ({ children }) => (
		<pre className="mb-2 overflow-x-auto rounded-lg border border-black/10 bg-white/70 p-3 text-xs last:mb-0">
			{children}
		</pre>
	),
};

const hotels = [
	{ name: 'Memmo Príncipe Real', detail: '€240 · rooftop' },
	{ name: 'The Lumiares', detail: '€310 · suites' },
	{ name: 'The Vintage Lisbon', detail: '€190 · leafy' },
] as const;

const waveformBars = [14, 22, 17, 24, 16, 28, 20, 12, 26, 18, 23, 15, 25, 13] as const;

function AssistantLabel(): ReactElement {
	return (
		<div className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-wide text-[#8f8c98]">
			<span className="text-2xl leading-none text-[#8377df]" aria-hidden>
				*
			</span>
			<span>MIRA</span>
		</div>
	);
}

function MarkdownContent({ content }: { readonly content: string }): ReactElement {
	return (
		<div className="text-[15px] leading-relaxed text-[#28262f]">
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
		<div className="ml-auto flex w-full max-w-[476px] flex-col items-start gap-2">
			<div className="flex h-10 w-full items-center gap-4 rounded-full bg-[#edeef3] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#8377df] text-white">
					<Play className="ml-0.5 size-3 fill-current" />
				</span>
				<div className="flex flex-1 items-center gap-1" aria-hidden>
					{waveformBars.map((height, index) => (
						<span
							key={`${height}-${index}`}
							className="w-1 rounded-full bg-[#6f6f7b]"
							style={{ height }}
						/>
					))}
				</div>
				<span className="font-mono text-xs font-semibold text-[#8e8d98]">0:06</span>
			</div>
			<p className="px-1 text-sm font-medium italic leading-snug text-[#8c8994]">
				&quot;find me a hotel in príncipe real for three nights&quot;
			</p>
		</div>
	);
}

function ReferenceConversation(): ReactElement {
	return (
		<div className="mx-auto flex w-full max-w-[790px] flex-col gap-6 px-3 pb-4 pt-6">
			<AudioPreview />
			<section className="flex max-w-[540px] flex-col gap-4" aria-label="Assistant hotel picks">
				<AssistantLabel />
				<p className="text-base font-medium leading-tight text-[#28262f]">
					Three quiet picks, walking distance to bakeries:
				</p>
				<div className="flex flex-col gap-3">
					{hotels.map((hotel) => (
						<div
							key={hotel.name}
							className="grid min-h-10 grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-[#e5e0e6] bg-[#f7f4f6] px-4 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
						>
							<div className="flex min-w-0 items-center gap-4">
								<span className="size-1.5 rounded-full bg-[#8377df]" aria-hidden />
								<span className="truncate font-semibold text-[#25242b]">{hotel.name}</span>
							</div>
							<span className="text-sm font-semibold text-[#92909a]">{hotel.detail}</span>
						</div>
					))}
				</div>
			</section>
			<section
				className="ml-auto flex w-full max-w-[455px] flex-col gap-2"
				aria-label="User selection"
			>
				<div className="border-l-4 border-[#8377df] bg-[#f0eff4] px-4 py-2 text-sm font-medium text-[#777481]">
					Memmo Príncipe Real — €240 · rooftop
				</div>
				<div className="rounded-3xl bg-[#f0eff4] px-5 py-3 text-base font-medium leading-tight text-[#25242b]">
					book this one for the 14th to the 17th
				</div>
			</section>
			<section className="flex max-w-[470px] flex-col gap-3" aria-label="Booking confirmation">
				<AssistantLabel />
				<div className="rounded-2xl bg-white p-5 shadow-[0_18px_45px_rgba(72,62,94,0.08)]">
					<div className="grid grid-cols-[52px_1fr] gap-4">
						<div className="flex size-10 items-center justify-center rounded-xl bg-[#f0edff] text-[#8377df]">
							<Calendar className="size-5" />
						</div>
						<div className="min-w-0">
							<h2 className="truncate text-base font-bold leading-tight text-[#232129]">
								Memmo Príncipe Real · 3 nights
							</h2>
							<p className="mt-1 text-sm font-medium text-[#8e8b96]">
								May 14 → 17 · King room · €720 total
							</p>
						</div>
					</div>
					<div className="mt-5 flex flex-wrap gap-3">
						<Button
							type="button"
							className="h-9 rounded-xl bg-[#8377df] px-4 text-sm font-bold text-white hover:bg-[#7569d3]"
						>
							Confirm booking
						</Button>
						<Button
							type="button"
							variant="outline"
							className="h-9 rounded-xl border-[#e5e1e7] bg-white px-4 text-sm font-medium text-[#383540] hover:bg-[#f6f3f6]"
						>
							Change dates
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
			<div className="max-w-[76%] rounded-3xl bg-[#f0eff4] px-5 py-3 text-[17px] font-medium leading-relaxed text-[#25242b]">
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
		<div className="flex max-w-[720px] flex-col gap-2">
			<AssistantLabel />
			<div className="group/message flex items-start gap-2">
				<div className="rounded-2xl bg-white/70 px-4 py-3 shadow-[0_10px_30px_rgba(72,62,94,0.06)]">
					<MarkdownContent content={content} />
				</div>
				<TooltipIconButton
					label="Copy message"
					className="mt-1 size-8 rounded-full text-[#8e8b96] opacity-0 transition-opacity hover:bg-[#edeaf1] hover:text-[#25242b] group-hover/message:opacity-100 focus-visible:opacity-100"
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
		<div className="flex max-w-[720px] flex-col gap-3">
			<AssistantLabel />
			<div
				className="flex flex-col gap-3 rounded-2xl border border-[#e4dfe6] bg-white/80 p-4 shadow-[0_14px_35px_rgba(72,62,94,0.07)]"
				role="group"
				aria-label={message.prompt}
			>
				<p className="text-[15px] font-semibold text-[#25242b]">{message.prompt}</p>
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
									'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8377df]',
									isSelected
										? 'border-[#8377df]/50 bg-[#f0edff] text-[#25242b]'
										: 'border-[#e5e0e6] bg-[#faf8fa] hover:bg-[#f3f0f4]'
								)}
							>
								<span
									className={cn(
										'mt-0.5 flex size-4 shrink-0 items-center justify-center border',
										option.kind === 'approval' ? 'rounded-full' : 'rounded-sm',
										isSelected ? 'border-[#8377df] bg-[#8377df]' : 'border-[#c9c4cf]'
									)}
									aria-hidden
								>
									{isSelected && <span className="size-1.5 rounded-full bg-white" />}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-sm font-semibold leading-snug">{option.label}</span>
									<span className="mt-1 block break-words text-xs leading-normal text-[#817e89]">
										{option.description}
									</span>
								</span>
							</button>
						);
					})}
				</div>
				<Button
					type="button"
					className="self-start rounded-xl bg-[#8377df] text-white hover:bg-[#7569d3]"
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
		<div className="flex max-w-[720px] flex-col gap-2">
			<AssistantLabel />
			<div className="flex items-center gap-3 text-[#817e89]">
				<div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-3">
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
	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			onSubmit();
		}
	};

	const handleInput = (event: ChangeEvent<HTMLTextAreaElement>): void => {
		const target = event.currentTarget;
		target.style.height = 'auto';
		target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
		onValueChange(target.value);
	};

	return (
		<div className="shrink-0 bg-gradient-to-t from-[#f4f5f8] via-[#f4f5f8]/95 to-transparent px-5 pb-5 pt-8">
			<div className="mx-auto flex min-h-[64px] w-full max-w-[840px] items-center gap-3 rounded-[22px] border border-[#e3dfe5] bg-white px-5 py-3 shadow-[0_18px_50px_rgba(69,61,86,0.10)] focus-within:ring-2 focus-within:ring-[#8377df]/20">
				<span className="shrink-0 text-xl leading-none text-[#b4b0ba]" aria-hidden>
					*
				</span>
				<Textarea
					ref={inputRef}
					value={value}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					placeholder="any other pastéis worth a detour?"
					rows={1}
					wrap="off"
					className="max-h-32 min-h-7 flex-1 resize-none overflow-x-auto whitespace-nowrap border-0 bg-transparent px-0 py-1 text-[15px] leading-snug text-[#25242b] shadow-none outline-none placeholder:text-[#25242b] focus-visible:!outline-none focus-visible:border-transparent focus-visible:ring-0 md:text-[15px]"
					aria-label="Message MIRA"
				/>
				<div className="flex shrink-0 items-center gap-3">
					<TooltipIconButton
						label="Switch to voice"
						className="size-10 rounded-full bg-[#f0eef2] text-[#5f5b66] hover:bg-[#e7e3ea] hover:text-[#25242b]"
						onClick={onVoiceModeRequest}
					>
						<Mic className="size-4" />
					</TooltipIconButton>
					<TooltipIconButton
						label={isLoading ? 'Stop response' : 'Send message'}
						className="size-10 rounded-full bg-[#8377df] text-white hover:bg-[#7569d3]"
						onClick={onSubmit}
					>
						{isLoading ? (
							<Square className="size-4 fill-current" />
						) : (
							<ArrowUp className="size-4" />
						)}
					</TooltipIconButton>
				</div>
			</div>
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
		<div className="relative flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#fbf8f6_0%,#f3f4f8_72%,#eef2f8_100%)] text-[#25242b]">
			<div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto">
				<div
					className={cn(
						'mx-auto flex min-h-full w-full max-w-[860px] flex-col gap-6 px-6',
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
		<kbd className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-[#efeaf4] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
			{children}
		</kbd>
	);
}

export function HomeVoiceView({ onSwitchToTyping }: HomeVoiceViewProps): ReactElement {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-[#1f1c24] text-[#eeeaf4]">
			<div className="flex flex-1 flex-col items-center px-8 pt-8 text-center">
				<div className="space-y-4">
					<p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8e8997]">Ready</p>
					<h1 className="text-[18px] font-semibold tracking-tight text-[#aaa5b0]">
						Hold the mic, or press and hold ⌘ space
					</h1>
				</div>
				<div className="flex flex-1 items-center">
					<button
						type="button"
						className="flex size-[56px] items-center justify-center rounded-full border border-white/20 bg-white/5 text-[#dad5df] shadow-[0_20px_65px_rgba(0,0,0,0.28)] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8377df] active:scale-[0.98]"
						aria-label="Hold to speak"
					>
						<Mic className="size-5" strokeWidth={1.8} />
					</button>
				</div>
				<div className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[12px] font-semibold text-[#77717e]">
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
			<div className="border-t border-white/10 px-6 py-4">
				<div className="flex min-h-10 items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-5 text-[13px] font-semibold text-[#aaa5b0]">
					<div className="flex items-center gap-3">
						<span className="size-3 rounded-full bg-[#77717e]" aria-hidden />
						<span>Voice mode</span>
					</div>
					<button
						type="button"
						onClick={onSwitchToTyping}
						className="flex items-center gap-3 rounded-full px-2 py-1 text-[#aaa5b0] transition hover:text-[#eeeaf4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8377df]"
					>
						<span>switch to typing</span>
						<span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-sm font-bold text-[#eeeaf4]">
							⌘ /
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
