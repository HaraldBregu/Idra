import type { ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import { ArrowUp, Calendar, Copy, Play, Sparkles, Square } from 'lucide-react';
import { VoiceOrbThree } from '@/components/ui/voice-orb-three';
import { PageContainer } from '@/components/app/base/page';
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
import { useChatMode } from '@/contexts/chat-mode';
import { cn } from '@/lib/utils';
import type {
	ApprovalDecision,
	AssistantHistoryMessage,
	AssistantPendingApproval,
	AssistantPendingEventPayload,
	AssistantPendingInput,
	AssistantResponseDelta,
} from '../../../../shared/service';

interface HomeTextMessage {
	readonly id: string;
	readonly role: 'user' | 'assistant';
	readonly type: 'text';
	readonly content: string;
}

interface HomeMultiSelectOption {
	readonly id: string;
	readonly kind: 'approval' | 'input';
	readonly label: string;
	readonly description: string;
	readonly approvalId?: string;
	readonly decision?: ApprovalDecision;
	readonly inputId?: string;
}

interface HomeMultiSelectMessage {
	readonly id: string;
	readonly role: 'assistant';
	readonly type: 'multi-select';
	readonly prompt: string;
	readonly options: readonly HomeMultiSelectOption[];
}

type HomeChatMessage = HomeTextMessage | HomeMultiSelectMessage;

interface HomeChatSurfaceProps {
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
	readonly onUseSuggestion: (prompt: string) => void;
}

function createTextMessage(role: HomeTextMessage['role'], content: string): HomeTextMessage {
	return {
		id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		role,
		type: 'text',
		content,
	};
}

const welcomeMessage: HomeChatMessage = {
	id: 'assistant-welcome',
	role: 'assistant',
	type: 'text',
	content:
		'Ready when you are. Ask Friday to inspect code, make a change, explain a file, or help plan the next step.',
};

const initialMessages: readonly HomeChatMessage[] = [welcomeMessage];

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

const waveformBars = [14, 22, 17, 24, 16, 28, 20, 12, 26, 18, 23, 15, 25, 13] as const;

const markdownComponents: Partial<Components> = {
	p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
	ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
	ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
};

function historyToChatMessages(history: AssistantHistoryMessage[]): HomeChatMessage[] {
	const out: HomeChatMessage[] = [];
	history.forEach((message, index) => {
		if (message.role !== 'user' && message.role !== 'assistant') return;
		if (typeof message.content !== 'string' || message.content.length === 0) return;
		out.push({
			id: `${message.role}-history-${index}`,
			role: message.role,
			type: 'text',
			content: message.content,
		});
	});
	return out;
}

function pendingToMultiSelectMessage(
	approvals: AssistantPendingApproval[],
	inputs: AssistantPendingInput[]
): HomeMultiSelectMessage {
	const options: HomeMultiSelectOption[] = [
		...approvals.map((approval) => ({
			id: `approval:${approval.id}:allow-once`,
			kind: 'approval' as const,
			label: `${approval.toolName}: Allow once`,
			description: approval.command ?? JSON.stringify(approval.argsPreview ?? {}),
			approvalId: approval.id,
			decision: 'allow-once' as const,
		})),
		...approvals
			.filter((approval) => approval.allowedDecisions.includes('allow-always'))
			.map((approval) => ({
				id: `approval:${approval.id}:allow-always`,
				kind: 'approval' as const,
				label: `${approval.toolName}: Allow always`,
				description: approval.command ?? JSON.stringify(approval.argsPreview ?? {}),
				approvalId: approval.id,
				decision: 'allow-always' as const,
			})),
		...approvals.map((approval) => ({
			id: `approval:${approval.id}:deny`,
			kind: 'approval' as const,
			label: `${approval.toolName}: Deny`,
			description: approval.command ?? JSON.stringify(approval.argsPreview ?? {}),
			approvalId: approval.id,
			decision: 'deny' as const,
		})),
		...inputs.map((input) => ({
			id: `input:${input.id}`,
			kind: 'input' as const,
			label: 'ask_human',
			description:
				input.question +
				(input.suggestions ? `\nSuggestions: ${input.suggestions.join(' | ')}` : ''),
			inputId: input.id,
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

function removeMultiSelectMessages(messages: readonly HomeChatMessage[]): HomeChatMessage[] {
	return messages.filter((message) => message.type !== 'multi-select');
}

function defaultPendingSelections(message: HomeMultiSelectMessage): string[] {
	const selections: string[] = [];
	const seenApprovals = new Set<string>();

	for (const option of message.options) {
		if (
			option.kind === 'approval' &&
			option.approvalId &&
			option.decision === 'deny' &&
			!seenApprovals.has(option.approvalId)
		) {
			selections.push(option.id);
			seenApprovals.add(option.approvalId);
		}
	}

	return selections;
}

function AssistantLabel(): ReactElement {
	return (
		<Message className="items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
			<Sparkles className="size-4 text-primary" aria-hidden />
			<span>Friday</span>
		</Message>
	);
}

function AudioPreview(): ReactElement {
	return (
		<Message className="ml-auto w-full max-w-lg flex-col items-start gap-2">
			<MessageContent className="flex h-10 w-full items-center gap-3 rounded-full px-3 py-0 shadow-sm">
				<span
					className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background"
					aria-hidden
				>
					<Play className="ml-0.5 size-3 fill-current" />
				</span>
				<span className="flex flex-1 items-center gap-1" aria-hidden>
					{waveformBars.map((height, index) => (
						<span
							key={`${height}-${index}`}
							className="w-1 rounded-full bg-current text-muted-foreground"
							style={{ height }}
						/>
					))}
				</span>
				<span className="font-mono text-xs font-semibold text-muted-foreground">0:06</span>
			</MessageContent>
			<p className="px-1 text-sm font-medium italic leading-snug text-muted-foreground">
				&quot;check the project and tell me what to fix first&quot;
			</p>
		</Message>
	);
}

function ReferenceConversation({
	onUseSuggestion,
}: {
	readonly onUseSuggestion: (prompt: string) => void;
}): ReactElement {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-2 pb-4 pt-5">
			<AudioPreview />
			<section className="flex max-w-xl flex-col gap-3" aria-label="Assistant suggestions">
				<AssistantLabel />
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
			<Message className="ml-auto w-full max-w-md flex-col gap-2" aria-label="User selection">
				<MessageContent className="rounded-none border-l-4 border-primary px-4 py-2 text-sm font-medium text-muted-foreground">
					Make an edit · small patch
				</MessageContent>
				<MessageContent className="rounded-3xl px-5 py-3 text-sm font-medium leading-tight">
					clean up the home layout
				</MessageContent>
			</Message>
			<section className="flex max-w-lg flex-col gap-3" aria-label="Assistant confirmation">
				<AssistantLabel />
				<MessageContent className="rounded-2xl p-5 shadow-sm">
					<div className="flex gap-4">
						<div className="flex size-10 items-center justify-center rounded-xl bg-background text-muted-foreground">
							<Calendar className="size-5" />
						</div>
						<div className="min-w-0 flex-1">
							<h2 className="truncate text-sm font-bold leading-tight text-foreground">
								Ready to update the homepage
							</h2>
							<p className="mt-1 text-xs font-medium text-muted-foreground">
								Small UI pass · theme colors · focused diff
							</p>
						</div>
					</div>
					<div className="mt-4 flex flex-wrap gap-2">
						<Button type="button" size="sm" className="rounded-xl">
							Apply change
						</Button>
						<Button type="button" variant="outline" size="sm" className="rounded-xl">
							Adjust scope
						</Button>
					</div>
				</MessageContent>
			</section>
		</div>
	);
}

function UserMessage({ content }: { readonly content: string }): ReactElement {
	return (
		<Message className="justify-end">
			<MessageContent className="max-w-xl rounded-3xl px-5 py-3 text-sm font-medium leading-relaxed">
				{content}
			</MessageContent>
		</Message>
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
		<Message className="max-w-2xl flex-col gap-2">
			<AssistantLabel />
			<div className="group/message flex items-start gap-2">
				<MessageContent
					markdown
					components={markdownComponents}
					className="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
				>
					{content}
				</MessageContent>
				<MessageActions className="pt-1">
					<MessageAction tooltip="Copy message">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="size-8 rounded-full opacity-0 transition-opacity group-hover/message:opacity-100 focus-visible:opacity-100"
							aria-label="Copy message"
							onClick={onCopy}
						>
							<Copy className="size-4" />
						</Button>
					</MessageAction>
				</MessageActions>
			</div>
		</Message>
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
		<Message className="max-w-2xl flex-col gap-3">
			<AssistantLabel />
			<MessageContent
				className="flex flex-col gap-3 rounded-2xl p-4 shadow-sm"
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
							<Button
								key={option.id}
								type="button"
								variant={isSelected ? 'secondary' : 'outline'}
								size="lg"
								role={option.kind === 'approval' ? 'radio' : 'checkbox'}
								aria-checked={isSelected}
								onClick={handleChange}
								className="h-auto w-full justify-start gap-3 whitespace-normal rounded-xl px-3 py-3 text-left"
							>
								<span
									className={cn(
										'mt-0.5 flex size-4 shrink-0 items-center justify-center border border-current',
										option.kind === 'approval' ? 'rounded-full' : 'rounded-sm'
									)}
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
				<Button type="button" size="sm" className="self-start rounded-xl" onClick={() => onSubmit(message)}>
					Confirm
				</Button>
			</MessageContent>
		</Message>
	);
}

function TypingIndicator(): ReactElement {
	return (
		<Message className="max-w-2xl flex-col gap-2">
			<AssistantLabel />
			<div className="flex items-center gap-3 text-muted-foreground">
				<MessageContent className="rounded-full px-4 py-3">
					<Loader variant="typing" size="sm" />
				</MessageContent>
				<span className="text-sm font-medium">Thinking</span>
			</div>
		</Message>
	);
}

function Composer({
	value,
	isLoading,
	inputRef,
	onValueChange,
	onSubmit,
}: {
	readonly value: string;
	readonly isLoading: boolean;
	readonly inputRef: RefObject<HTMLTextAreaElement | null>;
	readonly onValueChange: (value: string) => void;
	readonly onSubmit: () => void;
}): ReactElement {
	return (
		<div className="flex shrink-0 justify-center bg-gradient-to-t from-background via-background/95 to-transparent px-5 pb-5 pt-8">
			<PromptInput
				value={value}
				onValueChange={onValueChange}
				isLoading={isLoading}
				onSubmit={onSubmit}
				textareaRef={inputRef}
				className="w-full max-w-(--breakpoint-md)"
			>
				<PromptInputTextarea placeholder="Ask me anything..." aria-label="Message Friday" />
				<PromptInputActions className="justify-end pt-2">
					<PromptInputAction tooltip={isLoading ? 'Stop generation' : 'Send message'}>
						<Button
							type="button"
							variant="default"
							size="icon"
							className="h-8 w-8 rounded-full"
							aria-label={isLoading ? 'Stop generation' : 'Send message'}
							onClick={onSubmit}
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

function HomeChatSurface({
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
	onUseSuggestion,
}: HomeChatSurfaceProps): ReactElement {
	const showReferenceConversation = messages.length <= 1 && !isLoading && !historyLoading;

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
				inputRef={inputRef}
				onValueChange={onInputChange}
				onSubmit={onSubmit}
			/>
		</div>
	);
}

type VoiceOrbMode = 'idle' | 'listening' | 'speaking';

const VOICE_BLOBS = [
	{ fx: 0.85, fy: 0.72, r: 115, c: [196, 174, 255] },
	{ fx: 1.15, fy: 1.05, r: 95, c: [110, 72, 205] },
	{ fx: 0.68, fy: 1.35, r: 105, c: [228, 218, 255] },
	{ fx: 1.45, fy: 0.82, r: 90, c: [142, 108, 235] },
	{ fx: 1.05, fy: 1.58, r: 100, c: [72, 44, 158] },
	{ fx: 0.55, fy: 0.55, r: 108, c: [210, 192, 255] },
];

const VOICE_MODE_CONFIG: Record<
	VoiceOrbMode,
	{
		label: string;
		message: string;
		dotColor: string;
		speed: number;
		blobCount: number;
		blink: boolean;
		ringPulse: boolean;
		pulseFreq: number;
		waveform: boolean;
		glowAlpha: number;
	}
> = {
	idle: {
		label: 'Tap to activate',
		message: 'How can I help you today?',
		dotColor: 'rgba(148,114,243,0.65)',
		speed: 0.007,
		blobCount: 3,
		blink: false,
		ringPulse: false,
		pulseFreq: 0,
		waveform: false,
		glowAlpha: 0.18,
	},
	listening: {
		label: 'Listening...',
		message: "I'm listening, go ahead.",
		dotColor: '#5dd87e',
		speed: 0.018,
		blobCount: 5,
		blink: true,
		ringPulse: true,
		pulseFreq: 4.5,
		waveform: false,
		glowAlpha: 0.28,
	},
	speaking: {
		label: 'Speaking...',
		message: 'Ask me anything!',
		dotColor: '#9472f3',
		speed: 0.033,
		blobCount: 6,
		blink: false,
		ringPulse: true,
		pulseFreq: 7.5,
		waveform: true,
		glowAlpha: 0.4,
	},
};

const VOICE_BAR_COUNT = 20;

function voiceSn(x: number, y: number, z: number): number {
	return (
		Math.sin(x * 2.1 + z) * Math.cos(y * 1.7 + z * 0.9) * 0.5 +
		Math.sin(x * 3.7 + y * 2.3 + z * 1.3) * 0.3 +
		Math.cos(x * 1.2 + y * 4.1 + z * 0.7) * 0.2
	);
}

function voiceRgba(c: number[], a: number): string {
	return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function VoiceOrb(): ReactElement {
	const [mode, setMode] = useState<VoiceOrbMode>('idle');
	const orbRef = useRef<HTMLCanvasElement>(null);
	const waveRef = useRef<HTMLCanvasElement>(null);
	const ring1Ref = useRef<HTMLDivElement>(null);
	const ring2Ref = useRef<HTMLDivElement>(null);
	const afRef = useRef(0);
	const tRef = useRef(0);
	const barHRef = useRef<number[]>(new Array(VOICE_BAR_COUNT).fill(0));
	const modeRef = useRef<VoiceOrbMode>(mode);

	useEffect(() => {
		modeRef.current = mode;
	}, [mode]);

	const cycleMode = useCallback((): void => {
		setMode((prev) => {
			const keys = Object.keys(VOICE_MODE_CONFIG) as VoiceOrbMode[];
			return keys[(keys.indexOf(prev) + 1) % keys.length];
		});
	}, []);

	useEffect(() => {
		const orb = orbRef.current;
		if (!orb) return;
		const ctx = orb.getContext('2d')!;
		const wctx = waveRef.current?.getContext('2d') ?? null;
		const W = 400, H = 400, CX = 200, CY = 200, R = 186;

		function drawOrb(): void {
			const cfg = VOICE_MODE_CONFIG[modeRef.current];
			tRef.current += cfg.speed;
			const t = tRef.current;

			ctx.clearRect(0, 0, W, H);

			for (let i = 6; i > 0; i--) {
				ctx.beginPath();
				ctx.arc(CX, CY, R + i * 9, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(120,80,200,${cfg.glowAlpha * 0.055 * (7 - i)})`;
				ctx.fill();
			}

			ctx.save();
			ctx.beginPath();
			ctx.arc(CX, CY, R, 0, Math.PI * 2);
			ctx.clip();

			const bg = ctx.createRadialGradient(CX, CY - 25, 8, CX, CY, R);
			bg.addColorStop(0, '#cbbcfa');
			bg.addColorStop(0.42, '#9272de');
			bg.addColorStop(1, '#432a8c');
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, W, H);

			for (let i = 0; i < cfg.blobCount; i++) {
				const b = VOICE_BLOBS[i]!;
				const phase = (i / cfg.blobCount) * Math.PI * 2;
				const nx = CX + Math.sin(t * b.fx + phase) * 68;
				const ny = CY + Math.cos(t * b.fy + phase * 1.2) * 56;
				const nr = b.r + voiceSn(i * 0.7, t * 0.4, i) * 32;
				const alpha = 0.24 + voiceSn(i, t * 0.5, i + 1) * 0.1;
				const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
				g.addColorStop(0, voiceRgba(b.c, alpha + 0.18));
				g.addColorStop(0.55, voiceRgba(b.c, alpha));
				g.addColorStop(1, voiceRgba(b.c, 0));
				ctx.fillStyle = g;
				ctx.fillRect(0, 0, W, H);
			}

			const hl = ctx.createRadialGradient(CX - 58, CY - 58, 0, CX, CY, R);
			hl.addColorStop(0, 'rgba(255,255,255,0.4)');
			hl.addColorStop(0.38, 'rgba(255,255,255,0.07)');
			hl.addColorStop(1, 'rgba(0,0,0,0.22)');
			ctx.fillStyle = hl;
			ctx.fillRect(0, 0, W, H);
			ctx.restore();

			if (ring1Ref.current && ring2Ref.current) {
				if (cfg.ringPulse) {
					const p = (Math.sin(t * cfg.pulseFreq) + 1) / 2;
					ring1Ref.current.style.opacity = String(p * 0.85);
					ring2Ref.current.style.opacity = String(p * 0.5);
				} else {
					ring1Ref.current.style.opacity = '0';
					ring2Ref.current.style.opacity = '0';
				}
			}
		}

		function drawWave(): void {
			if (!wctx) return;
			const WW = 300, WH = 44;
			const cfg = VOICE_MODE_CONFIG[modeRef.current];
			const t = tRef.current;
			wctx.clearRect(0, 0, WW, WH);
			const barW = 9, gap = 6;
			const totalW = VOICE_BAR_COUNT * (barW + gap) - gap;
			const startX = (WW - totalW) / 2;

			for (let i = 0; i < VOICE_BAR_COUNT; i++) {
				const target = cfg.waveform
					? 6 + Math.abs(Math.sin(t * 5 + i * 0.6) * 14 + voiceSn(i * 0.3, t * 2, i) * 6)
					: 3;
				barHRef.current[i] += (target - barHRef.current[i]) * 0.18;
				const bh = Math.max(3, barHRef.current[i]);
				const x = startX + i * (barW + gap);
				const y = (WH - bh) / 2;
				const a = cfg.waveform ? 0.4 + (barHRef.current[i] / 30) * 0.55 : 0.25;
				wctx.fillStyle = `rgba(148,114,243,${a})`;
				wctx.beginPath();
				wctx.roundRect(x, y, barW, bh, 3);
				wctx.fill();
			}
		}

		function loop(): void {
			drawOrb();
			drawWave();
			afRef.current = requestAnimationFrame(loop);
		}

		afRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(afRef.current);
	}, []);

	const cfg = VOICE_MODE_CONFIG[mode];

	return (
		<div className="flex flex-col items-center gap-4">
			<div
				role="button"
				tabIndex={0}
				aria-label={`Voice assistant, mode: ${mode}. Click to change.`}
				className="relative cursor-pointer"
				style={{ width: 220, height: 220 }}
				onClick={cycleMode}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') cycleMode();
				}}
			>
				<canvas
					ref={orbRef}
					width={400}
					height={400}
					style={{ width: 220, height: 220, borderRadius: '50%', display: 'block' }}
				/>
				<div
					ref={ring1Ref}
					className="pointer-events-none absolute rounded-full"
					style={{ inset: -16, border: '1.5px solid rgba(148,114,243,0.5)', opacity: 0, transition: 'opacity 0.08s' }}
				/>
				<div
					ref={ring2Ref}
					className="pointer-events-none absolute rounded-full"
					style={{ inset: -34, border: '1px solid rgba(148,114,243,0.28)', opacity: 0, transition: 'opacity 0.08s' }}
				/>
			</div>
			<div className="flex items-center gap-2" style={{ height: 22 }}>
				<div
					className="size-2 rounded-full"
					style={{
						background: cfg.dotColor,
						transition: 'background 0.4s',
						animation: cfg.blink ? 'voiceOrbBlink 1.3s ease-in-out infinite' : 'none',
					}}
				/>
				<span
					className="text-sm italic"
					style={{
						color: 'rgba(120,88,220,0.88)',
						animation: cfg.blink ? 'voiceOrbBlink 1.3s ease-in-out infinite' : 'none',
					}}
				>
					{cfg.label}
				</span>
			</div>
			<p
				className="text-center text-sm"
				style={{ color: 'rgba(80,55,130,0.72)', maxWidth: 280, lineHeight: 1.65, minHeight: 72 }}
			>
				{cfg.message}
			</p>
			<canvas
				ref={waveRef}
				width={300}
				height={44}
				style={{ width: 150, height: 22, opacity: cfg.waveform ? 1 : 0, transition: 'opacity 0.4s' }}
			/>
			<style>{`
				@keyframes voiceOrbBlink {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.2; }
				}
			`}</style>
		</div>
	);
}

function HomeVoiceSurface({ onSwitchToTyping }: { readonly onSwitchToTyping: () => void }): ReactElement {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
			<div className="flex flex-1 flex-col items-center justify-center px-8 py-8">
				<p className="mb-10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
					Voice Chat
				</p>
				<VoiceOrb />
			</div>
			<div className="border-t border-border px-6 py-4">
				<MessageContent className="flex min-h-10 items-center justify-between gap-4 rounded-full px-5 py-0 text-xs font-semibold text-muted-foreground">
					<div className="flex items-center gap-3">
						<span className="size-3 rounded-full bg-muted-foreground" aria-hidden />
						<span>Voice mode</span>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onSwitchToTyping}
						className="rounded-full"
					>
						<span>switch to typing</span>
						<span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
							⌘ /
						</span>
					</Button>
				</MessageContent>
			</div>
		</div>
	);
}

function HomePage(): ReactElement {
	const { mode, setMode } = useChatMode();
	const [messages, setMessages] = useState<readonly HomeChatMessage[]>(initialMessages);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [streamText, setStreamText] = useState('');
	const [streamStarted, setStreamStarted] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState<Record<string, readonly string[]>>({});
	const requestIdRef = useRef(0);
	const requestActiveRef = useRef(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const focusInput = useCallback((): void => {
		inputRef.current?.focus();
	}, []);

	const switchToTyping = useCallback((): void => {
		setMode('chat');
		window.requestAnimationFrame(focusInput);
	}, [focusInput, setMode]);

	const useSuggestion = useCallback(
		(prompt: string): void => {
			setInput(prompt);
			setMode('chat');
			window.requestAnimationFrame(focusInput);
		},
		[focusInput, setMode]
	);

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
				// Keep the reference-ready empty chat state.
			} finally {
				if (!cancelled) setHistoryLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const stopResponse = (): void => {
		requestIdRef.current += 1;
		requestActiveRef.current = false;
		setStreamText('');
		setStreamStarted(false);
		setIsLoading(false);
		void window.assistant.cancel();
	};

	const sendPrompt = async (prompt: string): Promise<void> => {
		const trimmed = prompt.trim();
		if (!trimmed) return;

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		requestActiveRef.current = true;

		setInput('');
		setStreamText('');
		setIsLoading(true);
		setStreamStarted(false);
		setMessages((current) => [
			...removeMultiSelectMessages(current),
			createTextMessage('user', trimmed),
		]);

		try {
			const response = await window.assistant.send(trimmed);
			if (requestIdRef.current !== requestId) return;
			requestActiveRef.current = false;
			setStreamText('');
			setStreamStarted(false);
			setIsLoading(false);
			if (response.trim().length > 0) {
				setMessages((current) => [...current, createTextMessage('assistant', response)]);
			}
		} catch (error) {
			if (requestIdRef.current !== requestId) return;
			requestActiveRef.current = false;
			setStreamText('');
			setStreamStarted(false);
			setIsLoading(false);
			const message = error instanceof Error ? error.message : 'Assistant request failed.';
			setMessages((current) => [...current, createTextMessage('assistant', message)]);
		}
	};

	useEffect(() => {
		const offPending = window.assistant.onPending((event: AssistantPendingEventPayload) => {
			const pendingMessage =
				event.approvals.length === 0 && event.inputs.length === 0
					? null
					: pendingToMultiSelectMessage(event.approvals, event.inputs);

			if (pendingMessage) {
				setSelectedOptions((current) => ({
					...current,
					[pendingMessage.id]: defaultPendingSelections(pendingMessage),
				}));
			}

			setMessages((current) => {
				const cleaned = removeMultiSelectMessages(current);
				if (!pendingMessage) return cleaned;
				return [...cleaned, pendingMessage];
			});
		});

		const offResponse = window.assistant.onResponse((event: AssistantResponseDelta) => {
			if (!requestActiveRef.current || !event.delta) return;
			setStreamText((current) => current + event.delta);
			setStreamStarted(true);
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

	const selectApprovalOption = (messageId: string, approvalId: string, optionId: string): void => {
		setSelectedOptions((current) => {
			const selected = current[messageId] ?? [];
			const next = [
				...selected.filter((id) => !id.startsWith(`approval:${approvalId}:`)),
				optionId,
			];
			return { ...current, [messageId]: next };
		});
	};

	const submitMultiSelect = async (message: HomeMultiSelectMessage): Promise<void> => {
		const selected = new Set(selectedOptions[message.id] ?? []);

		try {
			const approvals = new Map<string, ApprovalDecision>();

			for (const option of message.options) {
				if (option.kind === 'approval' && option.approvalId) {
					if (!approvals.has(option.approvalId)) approvals.set(option.approvalId, 'deny');
					if (selected.has(option.id)) {
						approvals.set(option.approvalId, option.decision ?? 'deny');
					}
				} else if (option.kind === 'input' && option.inputId) {
					await window.assistant.resolveInput(option.inputId, '');
				}
			}

			for (const [id, decision] of approvals) {
				await window.assistant.resolveApproval(id, decision);
			}

			const selectedLabels = message.options
				.filter((option) => selected.has(option.id))
				.map((option) => option.label);

			setMessages((current) => [
				...removeMultiSelectMessages(current),
				createTextMessage(
					'user',
					selectedLabels.length > 0
						? `Selected: ${selectedLabels.join(', ')}`
						: 'No actions selected.'
				),
			]);
			setSelectedOptions((current) => {
				const next = { ...current };
				delete next[message.id];
				return next;
			});
		} catch (error) {
			const messageText = error instanceof Error ? error.message : 'Selection failed.';
			setMessages((current) => [
				...removeMultiSelectMessages(current),
				createTextMessage('assistant', messageText),
			]);
		}
	};

	useEffect(() => {
		return () => {
			requestIdRef.current += 1;
			requestActiveRef.current = false;
		};
	}, []);

	useEffect(() => {
		const handler = (event: KeyboardEvent): void => {
			if ((event.metaKey || event.ctrlKey) && event.key === '/') {
				event.preventDefault();
				switchToTyping();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [switchToTyping]);

	useEffect(() => {
		if (mode === 'chat') {
			focusInput();
		}
	}, [focusInput, mode]);

	return (
		<PageContainer className="overflow-hidden text-foreground">
			{mode === 'voice' ? (
				<HomeVoiceSurface onSwitchToTyping={switchToTyping} />
			) : (
				<HomeChatSurface
					messages={messages}
					selectedOptions={selectedOptions}
					input={input}
					isLoading={isLoading}
					historyLoading={historyLoading}
					streamText={streamText}
					streamStarted={streamStarted}
					inputRef={inputRef}
					onInputChange={setInput}
					onSubmit={handleSubmit}
					onCopyMessage={copyMessage}
					onToggleOption={toggleOption}
					onSelectApprovalOption={selectApprovalOption}
					onSubmitPending={(message) => void submitMultiSelect(message)}
					onUseSuggestion={useSuggestion}
				/>
			)}
		</PageContainer>
	);
}

export default HomePage;
