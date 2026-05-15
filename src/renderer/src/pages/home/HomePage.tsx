import type { ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import { ArrowUp, Calendar, Copy, ListChecks, Mic, Play, Sparkles, Square } from 'lucide-react';
import { VoiceOrbThree } from '@/components/app/base/voice-orb-three';
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
import {
	Steps,
	StepsContent,
	StepsItem,
	StepsTrigger,
} from '@/components/prompt-kit/steps';
import { Tool, type ToolPart } from '@/components/prompt-kit/tool';
import { Button } from '@/components/ui/button';
import { useChatMode } from '@/contexts/chat-mode';
import { cn } from '@/lib/utils';
import type {
	ApprovalDecision,
	AssistantHistoryMessage,
	AssistantPendingApproval,
	AssistantPendingEventPayload,
	AssistantPendingInput,
	AssistantResponseEvent,
} from '../../../../shared/service';

type HomeToolCallState = ToolPart['state'];

interface HomeToolCall {
	readonly toolCallId: string;
	readonly toolName: string;
	readonly state: HomeToolCallState;
	readonly input?: unknown;
	readonly inputText?: string;
	readonly output?: unknown;
	readonly outputText?: string;
	readonly errorText?: string;
}

interface HomeTextMessage {
	readonly id: string;
	readonly role: 'user' | 'assistant';
	readonly type: 'text';
	readonly content: string;
	readonly tools?: readonly HomeToolCall[];
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
	readonly streamTools: readonly HomeToolCall[];
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
	readonly onVoiceModeRequest: () => void;
}

function createTextMessage(
	role: HomeTextMessage['role'],
	content: string,
	tools: readonly HomeToolCall[] = []
): HomeTextMessage {
	return {
		id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		role,
		type: 'text',
		content,
		...(role === 'assistant' && tools.length > 0 ? { tools } : {}),
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

function updateToolCall(
	tools: readonly HomeToolCall[],
	toolCallId: string,
	patch: Omit<Partial<HomeToolCall>, 'toolCallId'>
): HomeToolCall[] {
	const index = tools.findIndex((tool) => tool.toolCallId === toolCallId);
	if (index === -1) {
		return [
			...tools,
			{
				toolCallId,
				toolName: patch.toolName ?? 'tool',
				state: patch.state ?? 'input-streaming',
				input: patch.input,
				inputText: patch.inputText,
				output: patch.output,
				outputText: patch.outputText,
				errorText: patch.errorText,
			},
		];
	}

	return tools.map((tool, currentIndex) =>
		currentIndex === index ? { ...tool, ...patch, toolCallId } : tool
	);
}

function addToolResultToMessages(
	messages: readonly HomeChatMessage[],
	toolUseId: string | undefined,
	content: string | null | undefined,
	isError: boolean | undefined
): HomeChatMessage[] {
	if (!toolUseId) return [...messages];

	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message?.role !== 'assistant' || message.type !== 'text') continue;
		if (!message.tools?.some((tool) => tool.toolCallId === toolUseId)) continue;

		const nextMessage: HomeTextMessage = {
			...message,
			tools: updateToolCall(message.tools ?? [], toolUseId, {
				state: isError ? 'output-error' : 'output-available',
				output: content ?? '',
				outputText: content ?? '',
				errorText: isError ? (content ?? 'Tool call failed.') : undefined,
			}),
		};

		return messages.map((current, currentIndex) =>
			currentIndex === index ? nextMessage : current
		);
	}

	return [...messages];
}

function historyToChatMessages(history: AssistantHistoryMessage[]): HomeChatMessage[] {
	const out: HomeChatMessage[] = [];
	history.forEach((message, index) => {
		if (message.role === 'tool') {
			const next = addToolResultToMessages(out, message.toolUseId, message.content, message.isError);
			out.splice(0, out.length, ...next);
			return;
		}

		if (message.role !== 'user' && message.role !== 'assistant') return;
		const content = typeof message.content === 'string' ? message.content : '';
		const tools =
			message.role === 'assistant'
				? (message.contentBlocks ?? [])
						.filter((block) => block.type === 'tool_use' && block.toolUseId && block.toolName)
						.map((block) => ({
							toolCallId: block.toolUseId!,
							toolName: block.toolName!,
							state: 'input-available' as const,
							input: block.toolArgs ?? {},
						}))
				: [];

		if (content.length === 0 && tools.length === 0) return;
		out.push({
			id: `${message.role}-history-${index}`,
			role: message.role,
			type: 'text',
			content,
			...(message.role === 'assistant' && tools.length > 0 ? { tools } : {}),
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
	tools = [],
	isStreaming = false,
	onCopy,
}: {
	readonly content: string;
	readonly tools?: readonly HomeToolCall[];
	readonly isStreaming?: boolean;
	readonly onCopy: () => void;
}): ReactElement {
	return (
		<Message className="max-w-2xl flex-col gap-2">
			<AssistantLabel />
			<div className="group/message flex max-w-full items-start gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					{tools.length > 0 && <AssistantToolActivity tools={tools} isStreaming={isStreaming} />}
					{content.length > 0 && (
						<MessageContent
							markdown
							components={markdownComponents}
							className="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
						>
							{content}
						</MessageContent>
					)}
				</div>
				{content.length > 0 && (
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
				)}
			</div>
		</Message>
	);
}

function AssistantToolActivity({
	tools,
	isStreaming,
}: {
	readonly tools: readonly HomeToolCall[];
	readonly isStreaming: boolean;
}): ReactElement {
	const running = tools.some(
		(tool) => tool.state === 'input-streaming' || tool.state === 'input-available'
	);

	return (
		<MessageContent className="w-full rounded-2xl px-4 py-3 shadow-sm">
			<Steps defaultOpen>
				<StepsTrigger leftIcon={<ListChecks className="size-3.5" />}>
					{running ? 'Assistant activity' : `${tools.length} tool call${tools.length === 1 ? '' : 's'}`}
				</StepsTrigger>
				<StepsContent>
					{tools.map((tool) => (
						<StepsItem key={tool.toolCallId}>
							<span
								className={cn(
									'mt-3 size-2 shrink-0 rounded-full',
									tool.state === 'output-error' ? 'bg-destructive' : 'bg-muted-foreground/50'
								)}
								aria-hidden
							/>
							<Tool
								toolPart={{
									type: tool.toolName,
									state: tool.state,
									input: tool.input,
									inputText: tool.inputText,
									output: tool.output,
									outputText: tool.outputText,
									toolCallId: tool.toolCallId,
									errorText: tool.errorText,
								}}
								defaultOpen={isStreaming && tool.state !== 'output-available'}
								className="min-w-0 flex-1"
							/>
						</StepsItem>
					))}
				</StepsContent>
			</Steps>
		</MessageContent>
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
				<PromptInputActions className="justify-end gap-2 pt-2">
					<PromptInputAction tooltip="Voice assistant">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
							aria-label="Switch to voice"
							onClick={onVoiceModeRequest}
						>
							<Mic className="size-4" />
						</Button>
					</PromptInputAction>
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
	streamTools,
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
										tools={message.tools}
										onCopy={() => onCopyMessage(message.content)}
									/>
								);
							})}
							{isLoading && streamStarted && (streamText.length > 0 || streamTools.length > 0) && (
								<AssistantTextMessage
									content={streamText}
									tools={streamTools}
									isStreaming
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


function HomeVoiceSurface({ onSwitchToTyping }: { readonly onSwitchToTyping: () => void }): ReactElement {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
			<div className="flex flex-1 flex-col items-center justify-center px-8 py-8">
				<p className="mb-10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
					Voice Chat
				</p>
				<VoiceOrbThree />
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
	const [streamTools, setStreamTools] = useState<readonly HomeToolCall[]>([]);
	const [streamStarted, setStreamStarted] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState<Record<string, readonly string[]>>({});
	const requestIdRef = useRef(0);
	const requestActiveRef = useRef(false);
	const streamToolsRef = useRef<readonly HomeToolCall[]>([]);
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
		streamToolsRef.current = [];
		setStreamTools([]);
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
		streamToolsRef.current = [];
		setStreamTools([]);
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
			const tools = streamToolsRef.current;
			streamToolsRef.current = [];
			setStreamTools([]);
			setStreamStarted(false);
			setIsLoading(false);
			if (response.trim().length > 0 || tools.length > 0) {
				setMessages((current) => [...current, createTextMessage('assistant', response, tools)]);
			}
		} catch (error) {
			if (requestIdRef.current !== requestId) return;
			requestActiveRef.current = false;
			setStreamText('');
			streamToolsRef.current = [];
			setStreamTools([]);
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

		const offResponse = window.assistant.onResponse((event: AssistantResponseEvent) => {
			if (!requestActiveRef.current) return;
			if (event.type === 'text_delta') {
				if (!event.delta) return;
				setStreamText((current) => current + event.delta);
				setStreamStarted(true);
				return;
			}

			if (event.type === 'tool_call_start') {
				streamToolsRef.current = updateToolCall(streamToolsRef.current, event.toolCallId, {
					toolName: event.toolName,
					state: 'input-streaming',
					inputText: '',
				});
			} else if (event.type === 'tool_call_args_delta') {
				streamToolsRef.current = updateToolCall(streamToolsRef.current, event.toolCallId, {
					toolName: event.toolName,
					state: 'input-streaming',
					inputText: event.argsText,
				});
			} else if (event.type === 'tool_call_input') {
				streamToolsRef.current = updateToolCall(streamToolsRef.current, event.toolCallId, {
					toolName: event.toolName,
					state: 'input-available',
					input: event.input,
					inputText: event.argsText,
				});
			} else if (event.type === 'tool_call_result') {
				streamToolsRef.current = updateToolCall(streamToolsRef.current, event.toolCallId, {
					toolName: event.toolName,
					state: event.status === 'ok' ? 'output-available' : 'output-error',
					input: event.input,
					output: event.output,
					outputText: event.outputText,
					errorText: event.errorText,
				});
			}

			setStreamTools(streamToolsRef.current);
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
					streamTools={streamTools}
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
